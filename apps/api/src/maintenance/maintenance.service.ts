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

    if (!maintenance) {
      throw new NotFoundException('Maintenance record not found.');
    }

    return maintenance;
  }

  async createMaintenance(input: CreateMaintenanceInput) {
    const title = input.title?.trim();
    if (!input.equipmentId || !title || !input.startTime || !input.endTime) {
      throw new BadRequestException(
        'equipmentId, title, startTime, and endTime are required.',
      );
    }

    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid maintenance time format.');
    }

    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime.');
    }

    const equipment = await this.prisma.equipment.findUnique({
      where: { id: input.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found.');
    }

    const [bookingConflict, maintenanceConflict] = await Promise.all([
      this.prisma.booking.findFirst({
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
      this.prisma.maintenanceRecord.findFirst({
        where: {
          equipmentId: input.equipmentId,
          status: {
            in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.ACTIVE],
          },
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

    const maintenance = await this.prisma.maintenanceRecord.create({
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

    await this.prisma.auditLog.create({
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

    return {
      decision: 'MAINTENANCE_CREATED',
      maintenance,
    };
  }

  async updateStatus(input: UpdateMaintenanceStatusInput) {
    const maintenance = await this.prisma.maintenanceRecord.findUnique({
      where: { id: input.maintenanceId },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance record not found.');
    }

    if (maintenance.status === input.status) {
      throw new BadRequestException(`Maintenance is already ${input.status}.`);
    }

    const validTransition =
      (maintenance.status === MaintenanceStatus.SCHEDULED &&
        (input.status === MaintenanceStatus.ACTIVE || input.status === MaintenanceStatus.CANCELLED)) ||
      (maintenance.status === MaintenanceStatus.ACTIVE &&
        (input.status === MaintenanceStatus.COMPLETED || input.status === MaintenanceStatus.CANCELLED));

    if (!validTransition) {
      throw new BadRequestException(
        `Cannot change maintenance from ${maintenance.status} to ${input.status}.`,
      );
    }

    const updatedMaintenance = await this.prisma.maintenanceRecord.update({
      where: { id: input.maintenanceId },
      data: { status: input.status },
      include: { equipment: true },
    });

    if (input.status === MaintenanceStatus.ACTIVE) {
      await this.prisma.equipment.update({
        where: { id: maintenance.equipmentId },
        data: { status: EquipmentStatus.UNDER_MAINTENANCE },
      });
    }

    if (
      input.status === MaintenanceStatus.COMPLETED ||
      input.status === MaintenanceStatus.CANCELLED
    ) {
      const otherActive = await this.prisma.maintenanceRecord.findFirst({
        where: {
          equipmentId: maintenance.equipmentId,
          id: { not: input.maintenanceId },
          status: MaintenanceStatus.ACTIVE,
        },
        select: { id: true },
      });

      if (!otherActive) {
        const currentEquipment = await this.prisma.equipment.findUnique({
          where: { id: maintenance.equipmentId },
          select: { status: true },
        });

        if (currentEquipment?.status === EquipmentStatus.UNDER_MAINTENANCE) {
          await this.prisma.equipment.update({
            where: { id: maintenance.equipmentId },
            data: { status: EquipmentStatus.AVAILABLE },
          });
        }
      }
    }

    await this.prisma.auditLog.create({
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
  }
}

