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
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateMaintenanceInput = {
  equipmentId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  actorId: string;
};

type UpdateMaintenanceStatusInput = {
  maintenanceId: string;
  status: MaintenanceStatus;
  actorId: string;
};

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.maintenanceRecord.findMany({
      orderBy: { createdAt: 'desc' },
      include: { equipment: true },
    });
  }

  async findOne(id: string) {
    const maintenance = await this.prisma.maintenanceRecord.findUnique({
      where: { id },
      include: { equipment: true },
    });
    if (!maintenance) throw new NotFoundException('Maintenance record not found.');
    return maintenance;
  }

  private parseWindow(startValue: string, endValue: string) {
    const startTime = new Date(startValue);
    const endTime = new Date(endValue);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid maintenance time format.');
    }
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime.');
    }
    return { startTime, endTime };
  }

  private async lockEquipment(tx: Prisma.TransactionClient, equipmentId: string) {
    // Keep the transaction-level advisory lock, but return a normal integer
    // instead of PostgreSQL void so Prisma 7 / @prisma/adapter-pg can deserialize it.
    await tx.$queryRaw<Array<{ locked: number }>>`
      WITH lock_guard AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(hashtextextended(${equipmentId}, 0))
      )
      SELECT 1::int AS locked
      FROM lock_guard
    `;
  }

  async createMaintenance(input: CreateMaintenanceInput) {
    const title = input.title?.trim();
    if (!input.equipmentId || !title || !input.startTime || !input.endTime) {
      throw new BadRequestException(
        'equipmentId, title, startTime, and endTime are required.',
      );
    }
    const { startTime, endTime } = this.parseWindow(input.startTime, input.endTime);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockEquipment(tx, input.equipmentId);

        const equipment = await tx.equipment.findUnique({
          where: { id: input.equipmentId },
        });
        if (!equipment) throw new NotFoundException('Equipment not found.');
        if (equipment.status === EquipmentStatus.LOST || equipment.status === EquipmentStatus.RETIRED) {
          throw new ConflictException(`Cannot schedule maintenance for ${equipment.status} equipment.`);
        }

        const [bookingConflict, maintenanceConflict] = await Promise.all([
          tx.booking.findFirst({
            where: {
              equipmentId: input.equipmentId,
              status: {
                in: [
                  BookingStatus.PENDING,
                  BookingStatus.APPROVED,
                  BookingStatus.CHECKED_OUT,
                ],
              },
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            },
            select: { id: true },
          }),
          tx.maintenanceRecord.findFirst({
            where: {
              equipmentId: input.equipmentId,
              status: { in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.ACTIVE] },
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            },
            select: { id: true },
          }),
        ]);

        if (bookingConflict) {
          throw new ConflictException('Maintenance conflicts with an active booking.');
        }
        if (maintenanceConflict) {
          throw new ConflictException('Maintenance overlaps another maintenance window.');
        }

        const maintenance = await tx.maintenanceRecord.create({
          data: {
            equipmentId: input.equipmentId,
            title,
            description: input.description?.trim() || undefined,
            startTime,
            endTime,
            status: MaintenanceStatus.SCHEDULED,
          },
          include: { equipment: true },
        });

        await tx.auditLog.create({
          data: {
            actorId: input.actorId,
            equipmentId: input.equipmentId,
            action: 'MAINTENANCE_CREATED',
            entityType: 'MAINTENANCE',
            entityId: maintenance.id,
            metadata: {
              status: maintenance.status,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
            },
          },
        });

        return { decision: 'MAINTENANCE_CREATED', maintenance };
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
        throw new ConflictException('The maintenance window became unavailable.');
      }
      throw error;
    }
  }

  async updateStatus(input: UpdateMaintenanceStatusInput) {
    return this.prisma.$transaction(async (tx) => {
      const maintenance = await tx.maintenanceRecord.findUnique({
        where: { id: input.maintenanceId },
      });
      if (!maintenance) throw new NotFoundException('Maintenance record not found.');
      if (maintenance.status === input.status) {
        throw new BadRequestException(`Maintenance is already ${input.status}.`);
      }

      const validTransition =
        (maintenance.status === MaintenanceStatus.SCHEDULED &&
          (input.status === MaintenanceStatus.ACTIVE ||
            input.status === MaintenanceStatus.CANCELLED)) ||
        (maintenance.status === MaintenanceStatus.ACTIVE &&
          (input.status === MaintenanceStatus.COMPLETED ||
            input.status === MaintenanceStatus.CANCELLED));
      if (!validTransition) {
        throw new BadRequestException(
          `Cannot change maintenance from ${maintenance.status} to ${input.status}.`,
        );
      }

      await this.lockEquipment(tx, maintenance.equipmentId);

      if (input.status === MaintenanceStatus.ACTIVE) {
        const [equipment, physicallyCheckedOut, bookingConflict] = await Promise.all([
          tx.equipment.findUnique({
            where: { id: maintenance.equipmentId },
            select: { status: true },
          }),
          tx.booking.findFirst({
            where: {
              equipmentId: maintenance.equipmentId,
              status: BookingStatus.CHECKED_OUT,
            },
            select: { id: true },
          }),
          tx.booking.findFirst({
            where: {
              equipmentId: maintenance.equipmentId,
              status: {
                in: [
                  BookingStatus.PENDING,
                  BookingStatus.APPROVED,
                  BookingStatus.CHECKED_OUT,
                ],
              },
              startTime: { lt: maintenance.endTime },
              endTime: { gt: maintenance.startTime },
            },
            select: { id: true },
          }),
        ]);

        if (!equipment) throw new NotFoundException('Equipment not found.');
        if (
          equipment.status === EquipmentStatus.LOST ||
          equipment.status === EquipmentStatus.RETIRED
        ) {
          throw new ConflictException(
            `Cannot activate maintenance for ${equipment.status} equipment.`,
          );
        }
        if (equipment.status === EquipmentStatus.CHECKED_OUT || physicallyCheckedOut) {
          throw new ConflictException(
            'Cannot activate maintenance while the equipment is physically checked out.',
          );
        }
        if (bookingConflict) {
          throw new ConflictException('Maintenance conflicts with an active booking.');
        }
      }

      const changed = await tx.maintenanceRecord.updateMany({
        where: {
          id: input.maintenanceId,
          status: maintenance.status,
        },
        data: { status: input.status },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Maintenance changed while the request was being processed.');
      }

      if (input.status === MaintenanceStatus.ACTIVE) {
        await tx.equipment.update({
          where: { id: maintenance.equipmentId },
          data: { status: EquipmentStatus.UNDER_MAINTENANCE },
        });
      }

      if (
        input.status === MaintenanceStatus.COMPLETED ||
        input.status === MaintenanceStatus.CANCELLED
      ) {
        const otherActive = await tx.maintenanceRecord.findFirst({
          where: {
            equipmentId: maintenance.equipmentId,
            id: { not: input.maintenanceId },
            status: MaintenanceStatus.ACTIVE,
          },
          select: { id: true },
        });
        const checkedOut = await tx.booking.findFirst({
          where: {
            equipmentId: maintenance.equipmentId,
            status: BookingStatus.CHECKED_OUT,
          },
          select: { id: true },
        });
        if (!otherActive && !checkedOut) {
          await tx.equipment.updateMany({
            where: {
              id: maintenance.equipmentId,
              status: EquipmentStatus.UNDER_MAINTENANCE,
            },
            data: { status: EquipmentStatus.AVAILABLE },
          });
        }
      }

      const updatedMaintenance = await tx.maintenanceRecord.findUniqueOrThrow({
        where: { id: input.maintenanceId },
        include: { equipment: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          equipmentId: updatedMaintenance.equipmentId,
          action: 'MAINTENANCE_STATUS_UPDATED',
          entityType: 'MAINTENANCE',
          entityId: input.maintenanceId,
          metadata: {
            previousStatus: maintenance.status,
            newStatus: input.status,
          },
        },
      });

      return {
        decision: 'MAINTENANCE_STATUS_UPDATED',
        maintenance: updatedMaintenance,
      };
    });
  }
}
