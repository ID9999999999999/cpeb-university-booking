import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MaintenanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateMaintenanceInput = {
  equipmentId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status?: MaintenanceStatus;
  actorId?: string;
};

type UpdateMaintenanceStatusInput = {
  maintenanceId: string;
  status: MaintenanceStatus;
  actorId?: string;
};

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.maintenanceRecord.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        equipment: true,
      },
    });
  }

  async findOne(id: string) {
    const maintenance = await this.prisma.maintenanceRecord.findUnique({
      where: { id },
      include: {
        equipment: true,
      },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance record not found.');
    }

    return maintenance;
  }

  async createMaintenance(input: CreateMaintenanceInput) {
    if (!input.equipmentId || !input.title || !input.startTime || !input.endTime) {
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

    const allowedStatuses = Object.values(MaintenanceStatus);
    const status = input.status ?? MaintenanceStatus.SCHEDULED;

    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Invalid maintenance status.');
    }

    const equipment = await this.prisma.equipment.findUnique({
      where: { id: input.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found.');
    }

    const maintenance = await this.prisma.maintenanceRecord.create({
      data: {
        equipmentId: input.equipmentId,
        title: input.title,
        description: input.description,
        startTime,
        endTime,
        status,
      },
      include: {
        equipment: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        equipmentId: input.equipmentId,
        action: 'MAINTENANCE_CREATED',
        entityType: 'MAINTENANCE',
        entityId: maintenance.id,
        metadata: {
          maintenanceId: maintenance.id,
          equipmentId: input.equipmentId,
          status,
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
    const allowedStatuses = Object.values(MaintenanceStatus);

    if (!allowedStatuses.includes(input.status)) {
      throw new BadRequestException('Invalid maintenance status.');
    }

    const maintenance = await this.prisma.maintenanceRecord.findUnique({
      where: { id: input.maintenanceId },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance record not found.');
    }

    const updatedMaintenance = await this.prisma.maintenanceRecord.update({
      where: { id: input.maintenanceId },
      data: {
        status: input.status,
      },
      include: {
        equipment: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        equipmentId: updatedMaintenance.equipmentId,
        action: 'MAINTENANCE_STATUS_UPDATED',
        entityType: 'MAINTENANCE',
        entityId: input.maintenanceId,
        metadata: {
          maintenanceId: input.maintenanceId,
          equipmentId: updatedMaintenance.equipmentId,
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