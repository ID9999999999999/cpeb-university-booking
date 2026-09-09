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

type BookingWindowInput = {
  equipmentId: string;
  startTime: string;
  endTime: string;
};

type CreateBookingInput = BookingWindowInput & {
  userId: string;
  reason?: string;
};

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
    if (start < new Date()) {
      throw new BadRequestException('Time must be in future');
    }
    return { start, end };
  }

  async availability(input: BookingWindowInput) {
    const { start, end } = this.dates(input.startTime, input.endTime);
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: input.equipmentId },
    });
    if (!equipment) {
      throw new NotFoundException('Resource not found');
    }
    if (
      equipment.status === EquipmentStatus.UNDER_MAINTENANCE ||
      equipment.status === EquipmentStatus.LOST ||
      equipment.status === EquipmentStatus.RETIRED
    ) {
      return { available: false, reason: `Resource status is ${equipment.status}` };
    }

    const maintenanceConflict = await this.prisma.maintenanceRecord.findFirst({
      where: {
        equipmentId: input.equipmentId,
        status: { in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.ACTIVE] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });
    if (maintenanceConflict) {
      return { available: false, reason: 'Maintenance conflict' };
    }

    const bookingConflict = await this.prisma.booking.findFirst({
      where: {
        equipmentId: input.equipmentId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.CHECKED_OUT],
        },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    return bookingConflict
      ? { available: false, reason: 'Already booked' }
      : { available: true, reason: 'Available' };
  }

  async create(input: CreateBookingInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, isActive: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.isActive) {
      throw new BadRequestException('User is inactive');
    }

    const availability = await this.availability(input);
    if (!availability.available) {
      throw new ConflictException(availability.reason);
    }

    const { start, end } = this.dates(input.startTime, input.endTime);
    const booking = await this.prisma.booking.create({
      data: {
        equipmentId: input.equipmentId,
        userId: input.userId,
        startTime: start,
        endTime: end,
        reason: input.reason,
        status: BookingStatus.PENDING,
      },
      include: { equipment: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: input.userId,
        equipmentId: input.equipmentId,
        bookingId: booking.id,
        action: 'BOOKING_CREATED',
        entityType: 'BOOKING',
        entityId: booking.id,
        metadata: {
          status: booking.status,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        },
      },
    });

    return booking;
  }

  mine(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: { equipment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(id: string, userId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id, userId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.APPROVED
    ) {
      throw new BadRequestException('Cannot cancel');
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      include: { equipment: true },
    });

    await this.prisma.auditLog.create({
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
  }

  async finish(id: string, userId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id, userId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (
      booking.status !== BookingStatus.APPROVED &&
      booking.status !== BookingStatus.CHECKED_OUT
    ) {
      throw new BadRequestException('Cannot finish');
    }

    const nextStatus =
      booking.status === BookingStatus.CHECKED_OUT
        ? BookingStatus.RETURNED
        : BookingStatus.CLOSED;

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: nextStatus },
      include: { equipment: true },
    });

    await this.prisma.auditLog.create({
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
  }
}
