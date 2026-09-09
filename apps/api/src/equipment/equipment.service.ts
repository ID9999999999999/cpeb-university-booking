import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EquipmentStatus, MaintenanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateEquipmentInput = {
  name: string;
  category: string;
  inventoryTag: string;
  location?: string;
  description?: string;
  actorId: string;
};

type UpdateEquipmentStatusInput = {
  equipmentId: string;
  status: EquipmentStatus;
  actorId: string;
};

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.equipment.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
        { inventoryTag: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id } });

    if (!equipment) {
      throw new NotFoundException('Equipment not found.');
    }

    // General authenticated users receive equipment data only. Operational
    // booking, maintenance, repair, and user details stay behind admin routes.
    return equipment;
  }

  async createEquipment(input: CreateEquipmentInput) {
    const name = input.name?.trim();
    const category = input.category?.trim().toUpperCase();
    const inventoryTag = input.inventoryTag?.trim().toUpperCase();

    if (!name || !category || !inventoryTag) {
      throw new BadRequestException(
        'name, category, and inventoryTag are required.',
      );
    }

    const existing = await this.prisma.equipment.findUnique({
      where: { inventoryTag },
    });

    if (existing) {
      throw new ConflictException('Equipment inventoryTag already exists.');
    }

    const equipment = await this.prisma.equipment.create({
      data: {
        name,
        category,
        inventoryTag,
        location: input.location?.trim() || undefined,
        description: input.description?.trim() || undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        equipmentId: equipment.id,
        action: 'EQUIPMENT_CREATED',
        entityType: 'EQUIPMENT',
        entityId: equipment.id,
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

    if (equipment.status === input.status) {
      throw new BadRequestException(`Equipment is already ${input.status}.`);
    }

    if (input.status === EquipmentStatus.AVAILABLE) {
      const activeMaintenance = await this.prisma.maintenanceRecord.findFirst({
        where: {
          equipmentId: input.equipmentId,
          status: MaintenanceStatus.ACTIVE,
        },
        select: { id: true },
      });

      if (activeMaintenance) {
        throw new ConflictException(
          'Cannot mark equipment AVAILABLE while active maintenance exists.',
        );
      }
    }

    const updatedEquipment = await this.prisma.equipment.update({
      where: { id: input.equipmentId },
      data: { status: input.status },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        equipmentId: input.equipmentId,
        action: 'EQUIPMENT_STATUS_UPDATED',
        entityType: 'EQUIPMENT',
        entityId: input.equipmentId,
        metadata: {
          previousStatus: equipment.status,
          newStatus: input.status,
        },
      },
    });

    return {
      decision: 'EQUIPMENT_STATUS_UPDATED',
      equipment: updatedEquipment,
    };
  }
}
