import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  EquipmentStatus,
  MaintenanceStatus,
  RepairTicketStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly p: PrismaService) {}

  async dashboard() {
    const [u, ua, e, ea, bp, ba, r, m] = await this.p.$transaction([
      this.p.user.count(),
      this.p.user.count({ where: { isActive: true } }),
      this.p.equipment.count(),
      this.p.equipment.count({ where: { status: EquipmentStatus.AVAILABLE } }),
      this.p.booking.count({ where: { status: BookingStatus.PENDING } }),
      this.p.booking.count({ where: { status: { in: [BookingStatus.APPROVED, BookingStatus.CHECKED_OUT] } } }),
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
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });
  }

  async updateUser(actorId: string, userId: string, body: { role?: UserRole; isActive?: boolean }) {
    const old = await this.p.user.findUnique({ where: { id: userId } });
    if (!old) throw new NotFoundException('User not found');
    if (body.role === undefined && body.isActive === undefined) {
      throw new BadRequestException('At least one user field must be changed');
    }
    if (actorId === userId && body.isActive === false) {
      throw new BadRequestException('Cannot deactivate own account');
    }
    if (actorId === userId && body.role !== undefined && body.role !== old.role) {
      throw new BadRequestException('Cannot change your own role');
    }

    const updated = await this.p.user.update({
      where: { id: userId },
      data: body,
      select: { id: true, fullName: true, email: true, role: true, isActive: true, updatedAt: true },
    });

    await this.log(actorId, 'USER_UPDATED', 'USER', userId, undefined, undefined, {
      previousRole: old.role,
      newRole: updated.role,
      previousActive: old.isActive,
      newActive: updated.isActive,
    });
    return updated;
  }

  bookings(status?: BookingStatus) {
    return this.p.booking.findMany({
      where: { status },
      include: {
        equipment: true,
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
      orderBy: [{ startTime: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async bookingStatus(
    actorId: string,
    id: string,
    status: BookingStatus,
    action: string,
    metadata?: Record<string, unknown>,
  ) {
    const old = await this.p.booking.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Booking not found');

    const allowedTransition =
      ((status === BookingStatus.APPROVED || status === BookingStatus.REJECTED) &&
        old.status === BookingStatus.PENDING) ||
      (status === BookingStatus.CHECKED_OUT &&
        old.status === BookingStatus.APPROVED) ||
      (status === BookingStatus.RETURNED &&
        old.status === BookingStatus.CHECKED_OUT) ||
      (status === BookingStatus.CLOSED &&
        (old.status === BookingStatus.APPROVED ||
          old.status === BookingStatus.RETURNED));

    if (!allowedTransition) {
      throw new BadRequestException(`Cannot change booking from ${old.status} to ${status}`);
    }

    const updated = await this.p.booking.update({
      where: { id },
      data: { status },
      include: {
        equipment: true,
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.log(actorId, action, 'BOOKING', id, old.equipmentId, id, {
      previousStatus: old.status,
      newStatus: updated.status,
      ...(metadata ?? {}),
    });
    return updated;
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
    if (await this.p.equipment.findUnique({ where: { inventoryTag } })) {
      throw new ConflictException('Inventory tag already used');
    }

    const created = await this.p.equipment.create({
      data: {
        name: body.name.trim(),
        category: body.category.trim().toUpperCase(),
        inventoryTag,
        location: body.location?.trim(),
        description: body.description?.trim(),
        status: EquipmentStatus.AVAILABLE,
      },
    });
    await this.log(actorId, 'EQUIPMENT_CREATED', 'EQUIPMENT', created.id, created.id);
    return created;
  }

  async equipmentStatus(actorId: string, id: string, status: EquipmentStatus) {
    const old = await this.p.equipment.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Equipment not found');
    if (old.status === status) {
      throw new BadRequestException(`Equipment is already ${status}`);
    }
    if (status === EquipmentStatus.AVAILABLE) {
      const activeMaintenance = await this.p.maintenanceRecord.findFirst({
        where: { equipmentId: id, status: MaintenanceStatus.ACTIVE },
        select: { id: true },
      });
      if (activeMaintenance) {
        throw new ConflictException('Equipment has active maintenance');
      }
    }

    const updated = await this.p.equipment.update({ where: { id }, data: { status } });
    await this.log(actorId, 'EQUIPMENT_STATUS_UPDATED', 'EQUIPMENT', id, id, undefined, {
      previousStatus: old.status,
      newStatus: updated.status,
    });
    return updated;
  }

  reports(status?: RepairTicketStatus) {
    return this.p.repairTicket.findMany({
      where: { status },
      include: {
        equipment: true,
        technician: { select: { id: true, fullName: true, email: true } },
        reporter: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reportStatus(actorId: string, id: string, status: RepairTicketStatus, diagnosis?: string) {
    const old = await this.p.repairTicket.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Report not found');
    if (old.status === status) {
      throw new BadRequestException(`Report is already ${status}`);
    }
    if (old.status === RepairTicketStatus.CLOSED) {
      throw new BadRequestException('Closed repair tickets cannot be reopened');
    }

    const updated = await this.p.repairTicket.update({
      where: { id },
      data: { status, diagnosis: diagnosis === undefined ? undefined : diagnosis.trim() },
      include: {
        equipment: true,
        technician: { select: { id: true, fullName: true, email: true, role: true } },
        reporter: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });

    await this.log(actorId, 'REPORT_STATUS_UPDATED', 'REPAIR_TICKET', id, old.equipmentId, undefined, {
      previousStatus: old.status,
      newStatus: updated.status,
    });
    return updated;
  }

  async assignReport(actorId: string, id: string, technicianId: string) {
    const [report, technician] = await Promise.all([
      this.p.repairTicket.findUnique({ where: { id } }),
      this.p.user.findUnique({ where: { id: technicianId } }),
    ]);
    if (!report) throw new NotFoundException('Report not found');
    if (!technician || technician.role !== UserRole.TECHNICIAN || !technician.isActive) {
      throw new BadRequestException('Active technician required');
    }

    const updated = await this.p.repairTicket.update({
      where: { id },
      data: {
        technicianId,
        status: report.status === RepairTicketStatus.OPEN ? RepairTicketStatus.DIAGNOSING : report.status,
      },
      include: {
        equipment: true,
        technician: { select: { id: true, fullName: true, email: true, role: true } },
        reporter: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });
    await this.log(actorId, 'REPORT_ASSIGNED', 'REPAIR_TICKET', id, report.equipmentId, undefined, { technicianId });
    return updated;
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
    if (!(await this.p.equipment.findUnique({ where: { id: body.equipmentId } }))) {
      throw new NotFoundException('Equipment not found');
    }

    const [bookingConflict, maintenanceConflict] = await Promise.all([
      this.p.booking.findFirst({
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
      this.p.maintenanceRecord.findFirst({
        where: {
          equipmentId: body.equipmentId,
          status: {
            in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.ACTIVE],
          },
          startTime: { lt: end },
          endTime: { gt: start },
        },
        select: { id: true },
      }),
    ]);

    if (bookingConflict) {
      throw new ConflictException('Maintenance conflicts with booking');
    }
    if (maintenanceConflict) {
      throw new ConflictException('Maintenance overlaps another maintenance window');
    }

    const created = await this.p.maintenanceRecord.create({
      data: {
        equipmentId: body.equipmentId,
        title: body.title.trim(),
        description: body.description?.trim(),
        startTime: start,
        endTime: end,
        status: MaintenanceStatus.SCHEDULED,
      },
      include: { equipment: true },
    });
    await this.log(actorId, 'MAINTENANCE_CREATED', 'MAINTENANCE', created.id, body.equipmentId);
    return created;
  }

  async maintenanceStatus(actorId: string, id: string, status: MaintenanceStatus) {
    const old = await this.p.maintenanceRecord.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Maintenance not found');
    if (old.status === status) {
      throw new BadRequestException(`Maintenance is already ${status}`);
    }

    const validTransition =
      (old.status === MaintenanceStatus.SCHEDULED &&
        (status === MaintenanceStatus.ACTIVE || status === MaintenanceStatus.CANCELLED)) ||
      (old.status === MaintenanceStatus.ACTIVE &&
        (status === MaintenanceStatus.COMPLETED || status === MaintenanceStatus.CANCELLED));

    if (!validTransition) {
      throw new BadRequestException(
        `Cannot change maintenance from ${old.status} to ${status}`,
      );
    }

    const updated = await this.p.maintenanceRecord.update({
      where: { id },
      data: { status },
      include: { equipment: true },
    });

    if (status === MaintenanceStatus.ACTIVE) {
      await this.p.equipment.update({
        where: { id: old.equipmentId },
        data: { status: EquipmentStatus.UNDER_MAINTENANCE },
      });
    }

    if (
      status === MaintenanceStatus.COMPLETED ||
      status === MaintenanceStatus.CANCELLED
    ) {
      const otherActive = await this.p.maintenanceRecord.findFirst({
        where: {
          equipmentId: old.equipmentId,
          id: { not: id },
          status: MaintenanceStatus.ACTIVE,
        },
        select: { id: true },
      });

      if (!otherActive) {
        const equipment = await this.p.equipment.findUnique({
          where: { id: old.equipmentId },
          select: { status: true },
        });

        if (equipment?.status === EquipmentStatus.UNDER_MAINTENANCE) {
          await this.p.equipment.update({
            where: { id: old.equipmentId },
            data: { status: EquipmentStatus.AVAILABLE },
          });
        }
      }
    }

    await this.log(
      actorId,
      'MAINTENANCE_STATUS_UPDATED',
      'MAINTENANCE',
      id,
      old.equipmentId,
      undefined,
      { previousStatus: old.status, newStatus: updated.status },
    );
    return updated;
  }

  audit(take: number) {
    const normalizedTake = Number.isFinite(take) ? Math.min(Math.max(Math.trunc(take), 1), 500) : 100;
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
    metadata?: Record<string, unknown>,
  ) {
    return this.p.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        equipmentId,
        bookingId,
        metadata: metadata as any,
      },
    });
  }
}

