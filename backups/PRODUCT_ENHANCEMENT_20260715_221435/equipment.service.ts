import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EquipmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateEquipmentInput = {
  name: string;
  category: string;
  inventoryTag: string;
  location?: string;
  description?: string;
};

type UpdateEquipmentStatusInput = {
  equipmentId: string;
  status: EquipmentStatus;
  actorId?: string;
};

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.equipment.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      include: {
        bookings: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        maintenanceRecords: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        repairTickets: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found.');
    }

    return equipment;
  }

  async createEquipment(input: CreateEquipmentInput) {
    if (!input.name || !input.category || !input.inventoryTag) {
      throw new BadRequestException(
        'name, category, and inventoryTag are required.',
      );
    }

    const existing = await this.prisma.equipment.findUnique({
      where: { inventoryTag: input.inventoryTag },
    });

    if (existing) {
      throw new ConflictException('Equipment inventoryTag already exists.');
    }

    const equipment = await this.prisma.equipment.create({
      data: {
        name: input.name,
        category: input.category,
        inventoryTag: input.inventoryTag,
        location: input.location,
        description: input.description,
      },
    });

    return {
      decision: 'EQUIPMENT_CREATED',
      equipment,
    };
  }

  async updateStatus(input: UpdateEquipmentStatusInput) {
    const allowedStatuses = Object.values(EquipmentStatus);

    if (!allowedStatuses.includes(input.status)) {
      throw new BadRequestException('Invalid equipment status.');
    }

    const equipment = await this.prisma.equipment.findUnique({
      where: { id: input.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found.');
    }

    const updatedEquipment = await this.prisma.equipment.update({
      where: { id: input.equipmentId },
      data: {
        status: input.status,
        auditLogs: {
          create: {
            actorId: input.actorId,
            action: 'EQUIPMENT_STATUS_UPDATED',
            entityType: 'EQUIPMENT',
            entityId: input.equipmentId,
            metadata: {
              previousStatus: equipment.status,
              newStatus: input.status,
            },
          },
        },
      },
      include: {
        auditLogs: true,
      },
    });

    return {
      decision: 'EQUIPMENT_STATUS_UPDATED',
      equipment: updatedEquipment,
    };
  }
}