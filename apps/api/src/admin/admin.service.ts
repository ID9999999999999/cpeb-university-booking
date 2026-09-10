import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  EquipmentStatus,
  MaintenanceStatus,
  Prisma,
  RepairTicketStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Actor = { id: string; role: UserRole };

@Injectable()
export class AdminService {
  constructor(private readonly p: PrismaService) {}

  private async lockEquipment(tx: Prisma.TransactionClient, equipmentId: string) {
    // Execute the transaction advisory lock while returning an integer that
    // Prisma 7 / @prisma/adapter-pg can deserialize safely.
    await tx.$queryRaw<Array<{ locked: number }>>`
      WITH lock_guard AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(hashtextextended(${equipmentId}, 0))
      )
      SELECT 1::int AS locked
      FROM lock_guard
    `;
  }

  async dashboard() {
    const [u, ua, e, ea, bp, ba, r, m] = await this.p.$transaction([
      this.p.user.count(),
      this.p.user.count({ where: { isActive: true } }),
      this.p.equipment.count(),
      this.p.equipment.count({ where: { status: EquipmentStatus.AVAILABLE } }),
      this.p.booking.count({ where: { status: BookingStatus.PENDING } }),
      this.p.booking.count({
        where: { status: { in: [BookingStatus.APPROVED, BookingStatus.CHECKED_OUT] } },
      }),
      this.p.repairTicket.count({
        where: {
          status: {
            in: [
              RepairTicketStatus.OPEN,
              RepairTicketStatus.DIAGNOSING,
              RepairTicketStatus.WAITING_PARTS,
              RepairTicketStatus.READY_FOR_TEST,
            ],
          },
        },
      }),
      this.p.maintenanceRecord.count({
        where: { status: { in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.ACTIVE] } },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      users: { total: u, active: ua },
      equipment: { total: e, available: ea },
      bookings: { pending: bp, active: ba },
      reports: { open: r },
      maintenance: { active: m },
    };
  }

  users(role?: UserRole, active?: boolean) {
    return this.p.user.findMany({
      where: { role, isActive: active },
      select: {
        id: true,
        fullName: true,
        studentId: true,
        email: true,
        emailVerified: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });
  }

  async updateUser(
    actorId: string,
    userId: string,
    body: { role?: UserRole; isActive?: boolean },
  ) {
    if (body.role === undefined && body.isActive === undefined) {
      throw new BadRequestException('At least one user field must be changed');
    }

    return this.p.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ locked: number }>>`
        WITH lock_guard AS MATERIALIZED (
          SELECT pg_advisory_xact_lock(hashtextextended('cpeb-admin-role', 0))
        )
        SELECT 1::int AS locked
        FROM lock_guard
      `;
      const old = await tx.user.findUnique({ where: { id: userId } });
      if (!old) throw new NotFoundException('User not found');

      if (actorId === userId && body.isActive === false) {
        throw new BadRequestException('Cannot deactivate own account');
      }
      if (actorId === userId && body.role !== undefined && body.role !== old.role) {
        throw new BadRequestException('Cannot change your own role');
      }

      const removesActiveAdmin =
        old.role === UserRole.ADMIN &&
        old.isActive &&
        (body.isActive === false ||
          (body.role !== undefined && body.role !== UserRole.ADMIN));

      if (removesActiveAdmin) {
        const otherAdmins = await tx.user.count({
          where: {
            id: { not: userId },
            role: UserRole.ADMIN,
            isActive: true,
          },
        });
        if (otherAdmins < 1) {
          throw new ConflictException('The last active administrator cannot be removed');
        }
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: body,
        select: {
          id: true,
          fullName: true,
          studentId: true,
          email: true,
          emailVerified: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      await this.logWith(tx, actorId, 'USER_UPDATED', 'USER', userId, undefined, undefined, {
        previousRole: old.role,
        newRole: updated.role,
        previousActive: old.isActive,
        newActive: updated.isActive,
      });
      return updated;
    });
  }

  bookings(status?: BookingStatus) {
    return this.p.booking.findMany({
      where: { status },
      include: {
        equipment: true,
        rating: true,
        user: {
          select: {
            id: true,
            fullName: true,
            studentId: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ startTime: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async bookingStatus(
    actorId: string,
    id: string,
    status: BookingStatus,
    action: string,
    metadata?: Prisma.InputJsonObject,
  ) {
    return this.p.$transaction(async (tx) => {
      const old = await tx.booking.findUnique({ where: { id } });
      if (!old) throw new NotFoundException('Booking not found');
      await this.lockEquipment(tx, old.equipmentId);

      const allowedTransition =
        ((status === BookingStatus.APPROVED || status === BookingStatus.REJECTED) &&
          old.status === BookingStatus.PENDING) ||
        (status === BookingStatus.CHECKED_OUT && old.status === BookingStatus.APPROVED) ||
        (status === BookingStatus.RETURNED && old.status === BookingStatus.CHECKED_OUT) ||
        (status === BookingStatus.CLOSED &&
          (old.status === BookingStatus.APPROVED || old.status === BookingStatus.RETURNED));

      if (!allowedTransition) {
        throw new BadRequestException(`Cannot change booking from ${old.status} to ${status}`);
      }

      if (
        (status === BookingStatus.CHECKED_OUT || status === BookingStatus.CLOSED) &&
        old.startTime.getTime() > Date.now()
      ) {
        throw new BadRequestException('Booking cannot be completed before its start time');
      }

      if (status === BookingStatus.CHECKED_OUT) {
        const equipment = await tx.equipment.findUnique({ where: { id: old.equipmentId } });
        if (!equipment) throw new NotFoundException('Equipment not found');
        if (
          equipment.status === EquipmentStatus.UNDER_MAINTENANCE ||
          equipment.status === EquipmentStatus.LOST ||
          equipment.status === EquipmentStatus.RETIRED ||
          equipment.status === EquipmentStatus.CHECKED_OUT
        ) {
          throw new ConflictException(`Equipment is ${equipment.status}`);
        }
      }

      const changed = await tx.booking.updateMany({
        where: { id, status: old.status },
        data: { status },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Booking changed while the request was being processed');
      }

      if (status === BookingStatus.CHECKED_OUT) {
        await tx.equipment.update({
          where: { id: old.equipmentId },
          data: { status: EquipmentStatus.CHECKED_OUT },
        });
      }

      if (status === BookingStatus.RETURNED || status === BookingStatus.CLOSED) {
        const activeMaintenance = await tx.maintenanceRecord.findFirst({
          where: { equipmentId: old.equipmentId, status: MaintenanceStatus.ACTIVE },
          select: { id: true },
        });
        if (!activeMaintenance) {
          await tx.equipment.updateMany({
            where: { id: old.equipmentId, status: EquipmentStatus.CHECKED_OUT },
            data: { status: EquipmentStatus.AVAILABLE },
          });
        }
      }

      const updated = await tx.booking.findUniqueOrThrow({
        where: { id },
        include: {
          equipment: true,
          rating: true,
          user: { select: { id: true, fullName: true, studentId: true, email: true } },
        },
      });

      await this.logWith(tx, actorId, action, 'BOOKING', id, old.equipmentId, id, {
        previousStatus: old.status,
        newStatus: updated.status,
        ...(metadata ?? {}),
      });
      return updated;
    });
  }

  equipment(category?: string, status?: EquipmentStatus) {
    return this.p.equipment.findMany({
      where: {
        category: category ? { equals: category, mode: 'insensitive' } : undefined,
        status,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }, { inventoryTag: 'asc' }],
    });
  }

  async createEquipment(actorId: string, body: any) {
    if (!body.name?.trim() || !body.category?.trim() || !body.inventoryTag?.trim()) {
      throw new BadRequestException('Name, category and inventory tag required');
    }

    const inventoryTag = body.inventoryTag.trim().toUpperCase();
    try {
      return await this.p.$transaction(async (tx) => {
        const created = await tx.equipment.create({
          data: {
            name: body.name.trim(),
            category: body.category.trim().toUpperCase(),
            inventoryTag,
            location: body.location?.trim() || undefined,
            description: body.description?.trim() || undefined,
            status: EquipmentStatus.AVAILABLE,
          },
        });
        await this.logWith(
          tx,
          actorId,
          'EQUIPMENT_CREATED',
          'EQUIPMENT',
          created.id,
          created.id,
        );
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Inventory tag already used');
      }
      throw error;
    }
  }

  async equipmentStatus(actorId: string, id: string, status: EquipmentStatus) {
    return this.p.$transaction(async (tx) => {
      await this.lockEquipment(tx, id);
      const old = await tx.equipment.findUnique({ where: { id } });
      if (!old) throw new NotFoundException('Equipment not found');
      if (old.status === status) {
        throw new BadRequestException(`Equipment is already ${status}`);
      }

      if (
        status === EquipmentStatus.CHECKED_OUT ||
        status === EquipmentStatus.UNDER_MAINTENANCE
      ) {
        throw new BadRequestException(
          status === EquipmentStatus.CHECKED_OUT
            ? 'Use the booking check-out workflow to mark equipment CHECKED_OUT'
            : 'Use a maintenance record to mark equipment UNDER_MAINTENANCE',
        );
      }
      if (old.status === EquipmentStatus.CHECKED_OUT) {
        throw new ConflictException(
          'Checked-out equipment must be returned through the booking workflow',
        );
      }
      if (old.status === EquipmentStatus.UNDER_MAINTENANCE) {
        throw new ConflictException(
          'Under-maintenance equipment must be released through the maintenance workflow',
        );
      }

      const [checkedOut, activeMaintenance, activeBooking] = await Promise.all([
        tx.booking.findFirst({
          where: { equipmentId: id, status: BookingStatus.CHECKED_OUT },
          select: { id: true },
        }),
        tx.maintenanceRecord.findFirst({
          where: { equipmentId: id, status: MaintenanceStatus.ACTIVE },
          select: { id: true },
        }),
        tx.booking.findFirst({
          where: {
            equipmentId: id,
            status: {
              in: [
                BookingStatus.PENDING,
                BookingStatus.APPROVED,
                BookingStatus.CHECKED_OUT,
              ],
            },
          },
          select: { id: true },
        }),
      ]);

      if (checkedOut) {
        throw new ConflictException('Equipment is currently checked out');
      }
      if (activeMaintenance) {
        throw new ConflictException('Equipment has active maintenance');
      }
      if (
        activeBooking &&
        (status === EquipmentStatus.LOST ||
          status === EquipmentStatus.RETIRED ||
          status === EquipmentStatus.RESERVED)
      ) {
        throw new ConflictException(
          'Resolve or cancel active bookings before making this equipment unavailable',
        );
      }

      const changed = await tx.equipment.updateMany({
        where: { id, status: old.status },
        data: { status },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Equipment changed while the request was being processed');
      }
      const updated = await tx.equipment.findUniqueOrThrow({ where: { id } });
      await this.logWith(tx, actorId, 'EQUIPMENT_STATUS_UPDATED', 'EQUIPMENT', id, id, undefined, {
        previousStatus: old.status,
        newStatus: updated.status,
      });
      return updated;
    });
  }

  reports(status: RepairTicketStatus | undefined, actor: Actor) {
    return this.p.repairTicket.findMany({
      where: {
        status,
        technicianId: actor.role === UserRole.TECHNICIAN ? actor.id : undefined,
      },
      include: {
        equipment: true,
        technician: { select: { id: true, fullName: true, email: true } },
        reporter: { select: { id: true, fullName: true, studentId: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reportStatus(
    actor: Actor,
    id: string,
    status: RepairTicketStatus,
    diagnosis?: string,
  ) {
    return this.p.$transaction(async (tx) => {
      const old = await tx.repairTicket.findUnique({ where: { id } });
      if (!old) throw new NotFoundException('Report not found');
      if (old.status === status) {
        throw new BadRequestException(`Report is already ${status}`);
      }
      if (old.status === RepairTicketStatus.CLOSED) {
        throw new BadRequestException('Closed repair tickets cannot be reopened');
      }

      if (actor.role === UserRole.TECHNICIAN) {
        if (old.technicianId !== actor.id) {
          throw new ForbiddenException('Technicians can update only assigned reports');
        }
        if (status === RepairTicketStatus.CLOSED) {
          throw new ForbiddenException('Only management can close a repair ticket');
        }
      }

      const allowed = new Map<RepairTicketStatus, RepairTicketStatus[]>([
        [RepairTicketStatus.OPEN, [RepairTicketStatus.DIAGNOSING]],
        [
          RepairTicketStatus.DIAGNOSING,
          [RepairTicketStatus.WAITING_PARTS, RepairTicketStatus.READY_FOR_TEST],
        ],
        [
          RepairTicketStatus.WAITING_PARTS,
          [RepairTicketStatus.DIAGNOSING, RepairTicketStatus.READY_FOR_TEST],
        ],
        [
          RepairTicketStatus.READY_FOR_TEST,
          [RepairTicketStatus.DIAGNOSING, RepairTicketStatus.RESOLVED],
        ],
        [RepairTicketStatus.RESOLVED, [RepairTicketStatus.CLOSED]],
        [RepairTicketStatus.CLOSED, []],
      ]);
      if (!allowed.get(old.status)?.includes(status)) {
        throw new BadRequestException(`Cannot change report from ${old.status} to ${status}`);
      }

      const normalizedDiagnosis = diagnosis?.trim();
      const effectiveDiagnosis = normalizedDiagnosis || old.diagnosis || undefined;
      if (status === RepairTicketStatus.RESOLVED && !effectiveDiagnosis) {
        throw new BadRequestException('A diagnosis is required before resolving a report');
      }

      const changed = await tx.repairTicket.updateMany({
        where: { id, status: old.status },
        data: {
          status,
          diagnosis: normalizedDiagnosis === undefined ? undefined : normalizedDiagnosis,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Report changed while the request was being processed');
      }

      const updated = await tx.repairTicket.findUniqueOrThrow({
        where: { id },
        include: {
          equipment: true,
          technician: { select: { id: true, fullName: true, email: true, role: true } },
          reporter: { select: { id: true, fullName: true, studentId: true, email: true, role: true } },
        },
      });

      await this.logWith(
        tx,
        actor.id,
        'REPORT_STATUS_UPDATED',
        'REPAIR_TICKET',
        id,
        old.equipmentId,
        undefined,
        { previousStatus: old.status, newStatus: updated.status },
      );
      return updated;
    });
  }

  async assignReport(actorId: string, id: string, technicianId: string) {
    return this.p.$transaction(async (tx) => {
      const [report, technician] = await Promise.all([
        tx.repairTicket.findUnique({ where: { id } }),
        tx.user.findUnique({ where: { id: technicianId } }),
      ]);
      if (!report) throw new NotFoundException('Report not found');
      if (report.status === RepairTicketStatus.CLOSED) {
        throw new BadRequestException('Closed repair tickets cannot be reassigned');
      }
      if (!technician || technician.role !== UserRole.TECHNICIAN || !technician.isActive) {
        throw new BadRequestException('Active technician required');
      }

      const updated = await tx.repairTicket.update({
        where: { id },
        data: {
          technicianId,
          status:
            report.status === RepairTicketStatus.OPEN
              ? RepairTicketStatus.DIAGNOSING
              : report.status,
        },
        include: {
          equipment: true,
          technician: { select: { id: true, fullName: true, email: true, role: true } },
          reporter: { select: { id: true, fullName: true, studentId: true, email: true, role: true } },
        },
      });
      await this.logWith(
        tx,
        actorId,
        'REPORT_ASSIGNED',
        'REPAIR_TICKET',
        id,
        report.equipmentId,
        undefined,
        { technicianId },
      );
      return updated;
    });
  }

  maintenance(status?: MaintenanceStatus) {
    return this.p.maintenanceRecord.findMany({
      where: { status },
      include: { equipment: true },
      orderBy: [{ startTime: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createMaintenance(actorId: string, body: any) {
    const start = new Date(body.startTime);
    const end = new Date(body.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      throw new BadRequestException('Valid times required');
    }

    try {
      return await this.p.$transaction(async (tx) => {
        await this.lockEquipment(tx, body.equipmentId);
        const equipment = await tx.equipment.findUnique({ where: { id: body.equipmentId } });
        if (!equipment) throw new NotFoundException('Equipment not found');
        if (equipment.status === EquipmentStatus.LOST || equipment.status === EquipmentStatus.RETIRED) {
          throw new ConflictException(`Cannot schedule maintenance for ${equipment.status} equipment`);
        }

        const [bookingConflict, maintenanceConflict] = await Promise.all([
          tx.booking.findFirst({
            where: {
              equipmentId: body.equipmentId,
              status: {
                in: [
                  BookingStatus.PENDING,
                  BookingStatus.APPROVED,
                  BookingStatus.CHECKED_OUT,
                ],
              },
              startTime: { lt: end },
              endTime: { gt: start },
            },
            select: { id: true },
          }),
          tx.maintenanceRecord.findFirst({
            where: {
              equipmentId: body.equipmentId,
              status: { in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.ACTIVE] },
              startTime: { lt: end },
              endTime: { gt: start },
            },
            select: { id: true },
          }),
        ]);
        if (bookingConflict) throw new ConflictException('Maintenance conflicts with booking');
        if (maintenanceConflict) {
          throw new ConflictException('Maintenance overlaps another maintenance window');
        }

        const created = await tx.maintenanceRecord.create({
          data: {
            equipmentId: body.equipmentId,
            title: body.title.trim(),
            description: body.description?.trim() || undefined,
            startTime: start,
            endTime: end,
            status: MaintenanceStatus.SCHEDULED,
          },
          include: { equipment: true },
        });
        await this.logWith(tx, actorId, 'MAINTENANCE_CREATED', 'MAINTENANCE', created.id, body.equipmentId);
        return created;
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('CPEB booking conflict') || message.includes('CPEB maintenance conflict')) {
        throw new ConflictException('The maintenance window became unavailable');
      }
      throw error;
    }
  }

  async maintenanceStatus(actorId: string, id: string, status: MaintenanceStatus) {
    return this.p.$transaction(async (tx) => {
      const old = await tx.maintenanceRecord.findUnique({ where: { id } });
      if (!old) throw new NotFoundException('Maintenance not found');
      await this.lockEquipment(tx, old.equipmentId);
      if (old.status === status) {
        throw new BadRequestException(`Maintenance is already ${status}`);
      }

      const validTransition =
        (old.status === MaintenanceStatus.SCHEDULED &&
          (status === MaintenanceStatus.ACTIVE || status === MaintenanceStatus.CANCELLED)) ||
        (old.status === MaintenanceStatus.ACTIVE &&
          (status === MaintenanceStatus.COMPLETED || status === MaintenanceStatus.CANCELLED));
      if (!validTransition) {
        throw new BadRequestException(`Cannot change maintenance from ${old.status} to ${status}`);
      }

      if (status === MaintenanceStatus.ACTIVE) {
        const [equipment, physicallyCheckedOut, bookingConflict] = await Promise.all([
          tx.equipment.findUnique({
            where: { id: old.equipmentId },
            select: { status: true },
          }),
          tx.booking.findFirst({
            where: {
              equipmentId: old.equipmentId,
              status: BookingStatus.CHECKED_OUT,
            },
            select: { id: true },
          }),
          tx.booking.findFirst({
            where: {
              equipmentId: old.equipmentId,
              status: {
                in: [
                  BookingStatus.PENDING,
                  BookingStatus.APPROVED,
                  BookingStatus.CHECKED_OUT,
                ],
              },
              startTime: { lt: old.endTime },
              endTime: { gt: old.startTime },
            },
            select: { id: true },
          }),
        ]);
        if (!equipment) throw new NotFoundException('Equipment not found');
        if (
          equipment.status === EquipmentStatus.LOST ||
          equipment.status === EquipmentStatus.RETIRED
        ) {
          throw new ConflictException(
            `Cannot activate maintenance for ${equipment.status} equipment`,
          );
        }
        if (equipment.status === EquipmentStatus.CHECKED_OUT || physicallyCheckedOut) {
          throw new ConflictException(
            'Cannot activate maintenance while equipment is physically checked out',
          );
        }
        if (bookingConflict) throw new ConflictException('Maintenance conflicts with booking');
      }

      const changed = await tx.maintenanceRecord.updateMany({
        where: { id, status: old.status },
        data: { status },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Maintenance changed while the request was being processed');
      }

      if (status === MaintenanceStatus.ACTIVE) {
        await tx.equipment.update({
          where: { id: old.equipmentId },
          data: { status: EquipmentStatus.UNDER_MAINTENANCE },
        });
      }

      if (status === MaintenanceStatus.COMPLETED || status === MaintenanceStatus.CANCELLED) {
        const [otherActive, checkedOut] = await Promise.all([
          tx.maintenanceRecord.findFirst({
            where: {
              equipmentId: old.equipmentId,
              id: { not: id },
              status: MaintenanceStatus.ACTIVE,
            },
            select: { id: true },
          }),
          tx.booking.findFirst({
            where: { equipmentId: old.equipmentId, status: BookingStatus.CHECKED_OUT },
            select: { id: true },
          }),
        ]);
        if (!otherActive && !checkedOut) {
          await tx.equipment.updateMany({
            where: { id: old.equipmentId, status: EquipmentStatus.UNDER_MAINTENANCE },
            data: { status: EquipmentStatus.AVAILABLE },
          });
        }
      }

      const updated = await tx.maintenanceRecord.findUniqueOrThrow({
        where: { id },
        include: { equipment: true },
      });
      await this.logWith(
        tx,
        actorId,
        'MAINTENANCE_STATUS_UPDATED',
        'MAINTENANCE',
        id,
        old.equipmentId,
        undefined,
        { previousStatus: old.status, newStatus: updated.status },
      );
      return updated;
    });
  }

  audit(take: number) {
    const normalizedTake = Number.isFinite(take)
      ? Math.min(Math.max(Math.trunc(take), 1), 500)
      : 100;
    return this.p.auditLog.findMany({
      take: normalizedTake,
      include: {
        actor: { select: { id: true, fullName: true, email: true, role: true } },
        equipment: true,
        booking: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private log(
    actorId: string | undefined,
    action: string,
    entityType: string,
    entityId?: string,
    equipmentId?: string,
    bookingId?: string,
    metadata?: Prisma.InputJsonObject,
  ) {
    return this.logWith(
      this.p,
      actorId,
      action,
      entityType,
      entityId,
      equipmentId,
      bookingId,
      metadata,
    );
  }

  private logWith(
    db: PrismaService | Prisma.TransactionClient,
    actorId: string | undefined,
    action: string,
    entityType: string,
    entityId?: string,
    equipmentId?: string,
    bookingId?: string,
    metadata?: Prisma.InputJsonObject,
  ) {
    return db.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        equipmentId,
        bookingId,
        metadata,
      },
    });
  }
}
