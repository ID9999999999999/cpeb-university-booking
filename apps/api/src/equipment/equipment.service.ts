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

  private async lockEquipment(tx: Prisma.TransactionClient, equipmentId: string) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${equipmentId}, 0))`;
  }

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
    if (!equipment) throw new NotFoundException('Equipment not found.');
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

    try {
      return await this.prisma.$transaction(async (tx) => {
        const equipment = await tx.equipment.create({
          data: {
            name,
            category,
            inventoryTag,
            location: input.location?.trim() || undefined,
            description: input.description?.trim() || undefined,
          },
        });

        await tx.auditLog.create({
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
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Equipment inventoryTag already exists.');
      }
      throw error;
    }
  }

  async updateStatus(input: UpdateEquipmentStatusInput) {
    const allowedStatuses = Object.values(EquipmentStatus);
    if (!allowedStatuses.includes(input.status)) {
      throw new BadRequestException('Invalid equipment status.');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.lockEquipment(tx, input.equipmentId);

      const equipment = await tx.equipment.findUnique({
        where: { id: input.equipmentId },
      });
      if (!equipment) throw new NotFoundException('Equipment not found.');
      if (equipment.status === input.status) {
        throw new BadRequestException(`Equipment is already ${input.status}.`);
      }

      if (
        input.status === EquipmentStatus.CHECKED_OUT ||
        input.status === EquipmentStatus.UNDER_MAINTENANCE
      ) {
        throw new BadRequestException(
          input.status === EquipmentStatus.CHECKED_OUT
            ? 'Use the booking check-out workflow to mark equipment CHECKED_OUT.'
            : 'Use a maintenance record to mark equipment UNDER_MAINTENANCE.',
        );
      }

      if (equipment.status === EquipmentStatus.CHECKED_OUT) {
        throw new ConflictException(
          'Checked-out equipment must be returned through the booking workflow.',
        );
      }
      if (equipment.status === EquipmentStatus.UNDER_MAINTENANCE) {
        throw new ConflictException(
          'Under-maintenance equipment must be released through the maintenance workflow.',
        );
      }

      const [checkedOutBooking, activeMaintenance, activeBooking] =
        await Promise.all([
          tx.booking.findFirst({
            where: {
              equipmentId: input.equipmentId,
              status: BookingStatus.CHECKED_OUT,
            },
            select: { id: true },
          }),
          tx.maintenanceRecord.findFirst({
            where: {
              equipmentId: input.equipmentId,
              status: MaintenanceStatus.ACTIVE,
            },
            select: { id: true },
          }),
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
            },
            select: { id: true },
          }),
        ]);

      if (checkedOutBooking) {
        throw new ConflictException(
          'Equipment has a checked-out booking and cannot be changed manually.',
        );
      }
      if (activeMaintenance) {
        throw new ConflictException(
          'Equipment has active maintenance and cannot be changed manually.',
        );
      }

      if (
        activeBooking &&
        (input.status === EquipmentStatus.LOST ||
          input.status === EquipmentStatus.RETIRED ||
          input.status === EquipmentStatus.RESERVED)
      ) {
        throw new ConflictException(
          'Resolve or cancel active bookings before making this equipment unavailable.',
        );
      }

      const changed = await tx.equipment.updateMany({
        where: { id: input.equipmentId, status: equipment.status },
        data: { status: input.status },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'Equipment changed while the request was being processed.',
        );
      }

      const updatedEquipment = await tx.equipment.findUniqueOrThrow({
        where: { id: input.equipmentId },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          equipmentId: input.equipmentId,
          action: 'EQUIPMENT_STATUS_UPDATED',
          entityType: 'EQUIPMENT',
          entityId: input.equipmentId,
          metadata: {
            previousStatus: equipment.status,
            newStatus: updatedEquipment.status,
          },
        },
      });

      return {
        decision: 'EQUIPMENT_STATUS_UPDATED',
        equipment: updatedEquipment,
      };
    });
  }
}
