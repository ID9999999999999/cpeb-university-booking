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
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateBookingInput = {
  equipmentId: string;
  userId: string;
  startTime: string;
  endTime: string;
  reason?: string;
};

type ApproveBookingInput = {
  bookingId: string;
  actorId: string;
};

type RejectBookingInput = {
  bookingId: string;
  actorId: string;
  reason?: string;
};

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.booking.findMany({
      include: {
        equipment: true,
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createBooking(input: CreateBookingInput) {
    const start = new Date(input.startTime);
    const end = new Date(input.endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format.');
    }

    if (start >= end) {
      throw new BadRequestException('startTime must be before endTime.');
    }

    const equipment = await this.prisma.equipment.findUnique({
      where: { id: input.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('Active user not found.');
    }

    if (
      equipment.status === EquipmentStatus.UNDER_MAINTENANCE ||
      equipment.status === EquipmentStatus.LOST ||
      equipment.status === EquipmentStatus.RETIRED
    ) {
      throw new ConflictException(
        `Equipment is not bookable because status is ${equipment.status}.`,
      );
    }

    const overlappingMaintenance =
      await this.prisma.maintenanceRecord.findFirst({
        where: {
          equipmentId: input.equipmentId,
          status: {
            in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.ACTIVE],
          },
          startTime: { lt: end },
          endTime: { gt: start },
        },
      });

    if (overlappingMaintenance) {
      throw new ConflictException(
        'Equipment is blocked by overlapping maintenance.',
      );
    }

    const overlappingBooking = await this.prisma.booking.findFirst({
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
    });

    if (overlappingBooking) {
      throw new ConflictException(
        'Booking conflict: this equipment is already booked during the requested time.',
      );
    }

    const booking = await this.prisma.booking.create({
      data: {
        equipmentId: input.equipmentId,
        userId: input.userId,
        startTime: start,
        endTime: end,
        status: BookingStatus.PENDING,
        reason: input.reason,
        auditLogs: {
          create: {
            actorId: input.userId,
            equipmentId: input.equipmentId,
            action: 'BOOKING_CREATED',
            entityType: 'BOOKING',
            metadata: {
              startTime: start.toISOString(),
              endTime: end.toISOString(),
              decision: 'PENDING_NO_CONFLICT',
            },
          },
        },
      },
      include: {
        equipment: true,
        user: true,
        auditLogs: true,
      },
    });

    return {
      decision: 'BOOKING_ACCEPTED_AS_PENDING',
      booking,
    };
  }

  async approveBooking(input: ApproveBookingInput) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: {
        equipment: true,
        user: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictException(
        `Booking cannot be approved because its status is ${booking.status}.`,
      );
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: input.actorId },
    });

    if (!actor || !actor.isActive) {
      throw new NotFoundException('Active actor not found.');
    }

    if (actor.role !== 'ADMIN' && actor.role !== 'LAB_MANAGER') {
      throw new ForbiddenException(
        'Only ADMIN or LAB_MANAGER can approve bookings.',
      );
    }

    const approvedBooking = await this.prisma.booking.update({
      where: { id: input.bookingId },
      data: {
        status: BookingStatus.APPROVED,
        auditLogs: {
          create: {
            actorId: input.actorId,
            equipmentId: booking.equipmentId,
            action: 'BOOKING_APPROVED',
            entityType: 'BOOKING',
            metadata: {
              previousStatus: booking.status,
              newStatus: BookingStatus.APPROVED,
              decision: 'APPROVED_BY_LAB_MANAGER',
            },
          },
        },
      },
      include: {
        equipment: true,
        user: true,
        auditLogs: true,
      },
    });

    return {
      decision: 'BOOKING_APPROVED',
      booking: approvedBooking,
    };
  }

  async rejectBooking(input: RejectBookingInput) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: {
        equipment: true,
        user: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictException(
        `Booking cannot be rejected because its status is ${booking.status}.`,
      );
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: input.actorId },
    });

    if (!actor || !actor.isActive) {
      throw new NotFoundException('Active actor not found.');
    }

    if (actor.role !== 'ADMIN' && actor.role !== 'LAB_MANAGER') {
      throw new ForbiddenException(
        'Only ADMIN or LAB_MANAGER can reject bookings.',
      );
    }

    const rejectedBooking = await this.prisma.booking.update({
      where: { id: input.bookingId },
      data: {
        status: BookingStatus.REJECTED,
        auditLogs: {
          create: {
            actorId: input.actorId,
            equipmentId: booking.equipmentId,
            action: 'BOOKING_REJECTED',
            entityType: 'BOOKING',
            metadata: {
              previousStatus: booking.status,
              newStatus: BookingStatus.REJECTED,
              decision: 'REJECTED_BY_LAB_MANAGER',
              reason: input.reason ?? null,
            },
          },
        },
      },
      include: {
        equipment: true,
        user: true,
        auditLogs: true,
      },
    });

    return {
      decision: 'BOOKING_REJECTED',
      booking: rejectedBooking,
    };
  }
}