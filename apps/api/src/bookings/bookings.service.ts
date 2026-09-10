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

type BookingWindowInput = {
  equipmentId: string;
  startTime: string;
  endTime: string;
};

type CreateBookingInput = BookingWindowInput & {
  userId: string;
  reason?: string;
};

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private dates(startTime: string, endTime: string) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    if (start >= end) {
      throw new BadRequestException('Start must be before end');
    }
    if (start.getTime() <= Date.now()) {
      throw new BadRequestException('Time must be in future');
    }
    return { start, end };
  }

  private async lockEquipment(tx: Prisma.TransactionClient, equipmentId: string) {
    // Keep the application-level transaction lock, but never expose PostgreSQL's
    // void return type to Prisma 7 / @prisma/adapter-pg. The MATERIALIZED CTE
    // guarantees the advisory lock is executed while the outer query returns
    // only a normal integer column that Prisma can deserialize safely.
    await tx.$queryRaw<Array<{ locked: number }>>`
      WITH lock_guard AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(hashtextextended(${equipmentId}, 0))
      )
      SELECT 1::int AS locked
      FROM lock_guard
    `;
  }

  private async availabilityWith(
    db: DbClient,
    input: BookingWindowInput,
    parsed?: { start: Date; end: Date },
  ) {
    const { start, end } = parsed ?? this.dates(input.startTime, input.endTime);
    const equipment = await db.equipment.findUnique({
      where: { id: input.equipmentId },
    });
    if (!equipment) {
      throw new NotFoundException('Resource not found');
    }

    if (
      equipment.status === EquipmentStatus.UNDER_MAINTENANCE ||
      equipment.status === EquipmentStatus.RESERVED ||
      equipment.status === EquipmentStatus.LOST ||
      equipment.status === EquipmentStatus.RETIRED ||
      equipment.status === EquipmentStatus.CHECKED_OUT
    ) {
      return { available: false, reason: `Resource status is ${equipment.status}` };
    }

    const [maintenanceConflict, bookingConflict] = await Promise.all([
      db.maintenanceRecord.findFirst({
        where: {
          equipmentId: input.equipmentId,
          status: { in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.ACTIVE] },
          startTime: { lt: end },
          endTime: { gt: start },
        },
        select: { id: true },
      }),
      db.booking.findFirst({
        where: {
          equipmentId: input.equipmentId,
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
    ]);

    if (maintenanceConflict) {
      return { available: false, reason: 'Maintenance conflict' };
    }
    if (bookingConflict) {
      return { available: false, reason: 'Already booked' };
    }
    return { available: true, reason: 'Available' };
  }

  async availability(input: BookingWindowInput) {
    return this.availabilityWith(this.prisma, input);
  }

  async create(input: CreateBookingInput) {
    const parsed = this.dates(input.startTime, input.endTime);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockEquipment(tx, input.equipmentId);

        const user = await tx.user.findUnique({
          where: { id: input.userId },
          select: { id: true, isActive: true, emailVerified: true },
        });
        if (!user) throw new NotFoundException('User not found');
        if (!user.isActive) throw new BadRequestException('User is inactive');
        if (!user.emailVerified) {
          throw new BadRequestException('Email verification is required');
        }

        const availability = await this.availabilityWith(tx, input, parsed);
        if (!availability.available) {
          throw new ConflictException(availability.reason);
        }

        const booking = await tx.booking.create({
          data: {
            equipmentId: input.equipmentId,
            userId: input.userId,
            startTime: parsed.start,
            endTime: parsed.end,
            reason: input.reason?.trim() || undefined,
            status: BookingStatus.PENDING,
          },
          include: { equipment: true, rating: true },
        });

        await tx.auditLog.create({
          data: {
            actorId: input.userId,
            equipmentId: input.equipmentId,
            bookingId: booking.id,
            action: 'BOOKING_CREATED',
            entityType: 'BOOKING',
            entityId: booking.id,
            metadata: {
              status: booking.status,
              startTime: parsed.start.toISOString(),
              endTime: parsed.end.toISOString(),
            },
          },
        });

        return booking;
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
        throw new ConflictException('The resource became unavailable. Choose another time.');
      }
      throw error;
    }
  }

  mine(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: { equipment: true, rating: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({ where: { id, userId } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (
        booking.status !== BookingStatus.PENDING &&
        booking.status !== BookingStatus.APPROVED
      ) {
        throw new BadRequestException('Cannot cancel this booking');
      }
      if (
        booking.status === BookingStatus.APPROVED &&
        booking.startTime.getTime() <= Date.now()
      ) {
        throw new BadRequestException('An approved booking cannot be cancelled after it starts');
      }

      const changed = await tx.booking.updateMany({
        where: { id, userId, status: booking.status },
        data: { status: BookingStatus.CANCELLED },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Booking changed while the request was being processed');
      }

      const updated = await tx.booking.findUniqueOrThrow({
        where: { id },
        include: { equipment: true, rating: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          equipmentId: booking.equipmentId,
          bookingId: id,
          action: 'BOOKING_CANCELLED',
          entityType: 'BOOKING',
          entityId: id,
          metadata: { previousStatus: booking.status, newStatus: updated.status },
        },
      });

      return updated;
    });
  }

  async finish(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({ where: { id, userId } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (
        booking.status !== BookingStatus.APPROVED &&
        booking.status !== BookingStatus.CHECKED_OUT
      ) {
        throw new BadRequestException('Cannot finish this booking');
      }
      if (booking.startTime.getTime() > Date.now()) {
        throw new BadRequestException('Booking cannot be finished before its start time');
      }

      const nextStatus =
        booking.status === BookingStatus.CHECKED_OUT
          ? BookingStatus.RETURNED
          : BookingStatus.CLOSED;

      const changed = await tx.booking.updateMany({
        where: { id, userId, status: booking.status },
        data: { status: nextStatus },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Booking changed while the request was being processed');
      }

      if (nextStatus === BookingStatus.RETURNED) {
        const activeMaintenance = await tx.maintenanceRecord.findFirst({
          where: {
            equipmentId: booking.equipmentId,
            status: MaintenanceStatus.ACTIVE,
          },
          select: { id: true },
        });
        if (!activeMaintenance) {
          await tx.equipment.updateMany({
            where: {
              id: booking.equipmentId,
              status: EquipmentStatus.CHECKED_OUT,
            },
            data: { status: EquipmentStatus.AVAILABLE },
          });
        }
      }

      const updated = await tx.booking.findUniqueOrThrow({
        where: { id },
        include: { equipment: true, rating: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          equipmentId: booking.equipmentId,
          bookingId: id,
          action:
            nextStatus === BookingStatus.RETURNED
              ? 'BOOKING_RETURNED'
              : 'BOOKING_CLOSED',
          entityType: 'BOOKING',
          entityId: id,
          metadata: { previousStatus: booking.status, newStatus: updated.status },
        },
      });

      return updated;
    });
  }

  async rate(id: string, userId: string, score: number, comment?: string) {
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id, userId },
        include: { equipment: true, rating: true },
      });
      if (!booking) throw new NotFoundException('Booking not found');
      if (
        booking.status !== BookingStatus.RETURNED &&
        booking.status !== BookingStatus.CLOSED
      ) {
        throw new BadRequestException('Only a finished booking can be rated');
      }

      const normalizedComment = comment?.trim() || undefined;
      const rating = await tx.bookingRating.upsert({
        where: { bookingId: id },
        create: { bookingId: id, userId, score, comment: normalizedComment },
        update: { userId, score, comment: normalizedComment },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          equipmentId: booking.equipmentId,
          bookingId: id,
          action: booking.rating ? 'BOOKING_RATING_UPDATED' : 'BOOKING_RATED',
          entityType: 'BOOKING_RATING',
          entityId: rating.id,
          metadata: { score },
        },
      });

      return rating;
    });
  }
}
