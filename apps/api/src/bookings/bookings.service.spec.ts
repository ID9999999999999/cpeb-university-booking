import { BadRequestException } from '@nestjs/common';
import { BookingStatus, EquipmentStatus } from '@prisma/client';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    equipment: { findUnique: jest.fn() },
    maintenanceRecord: { findFirst: jest.fn() },
    booking: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };

  let service: BookingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookingsService(prisma as any);
  });

  it('creates a pending booking and writes an audit log', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: true });
    prisma.equipment.findUnique.mockResolvedValue({ id: 'e1', status: EquipmentStatus.AVAILABLE });
    prisma.maintenanceRecord.findFirst.mockResolvedValue(null);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.booking.create.mockResolvedValue({
      id: 'b1',
      equipmentId: 'e1',
      userId: 'u1',
      status: BookingStatus.PENDING,
      equipment: { id: 'e1' },
    });
    prisma.auditLog.create.mockResolvedValue({ id: 'a1' });

    const result = await service.create({
      equipmentId: 'e1',
      userId: 'u1',
      startTime: '2099-01-01T10:00:00.000Z',
      endTime: '2099-01-01T11:00:00.000Z',
      reason: 'Lab work',
    });

    expect(result.status).toBe(BookingStatus.PENDING);
    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BookingStatus.PENDING, userId: 'u1', equipmentId: 'e1' }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'BOOKING_CREATED', actorId: 'u1', bookingId: 'b1' }),
      }),
    );
  });

  it('rejects an inactive user before creating a booking', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: false });

    await expect(
      service.create({
        equipmentId: 'e1',
        userId: 'u1',
        startTime: '2099-01-01T10:00:00.000Z',
        endTime: '2099-01-01T11:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it('does not allow a pending booking to be finished', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      id: 'b1', equipmentId: 'e1', userId: 'u1', status: BookingStatus.PENDING,
    });

    await expect(service.finish('b1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('logs a user cancellation', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      id: 'b1', equipmentId: 'e1', userId: 'u1', status: BookingStatus.PENDING,
    });
    prisma.booking.update.mockResolvedValue({
      id: 'b1', equipmentId: 'e1', userId: 'u1', status: BookingStatus.CANCELLED, equipment: { id: 'e1' },
    });
    prisma.auditLog.create.mockResolvedValue({ id: 'a1' });

    const result = await service.cancel('b1', 'u1');
    expect(result.status).toBe(BookingStatus.CANCELLED);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'BOOKING_CANCELLED', bookingId: 'b1' }),
      }),
    );
  });

  it('marks a checked-out booking as returned when the user finishes it', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      id: 'b2',
      equipmentId: 'e1',
      userId: 'u1',
      status: BookingStatus.CHECKED_OUT,
    });
    prisma.booking.update.mockResolvedValue({
      id: 'b2',
      equipmentId: 'e1',
      userId: 'u1',
      status: BookingStatus.RETURNED,
      equipment: { id: 'e1' },
    });
    prisma.auditLog.create.mockResolvedValue({ id: 'a2' });

    const result = await service.finish('b2', 'u1');

    expect(result.status).toBe(BookingStatus.RETURNED);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'BOOKING_RETURNED',
          bookingId: 'b2',
        }),
      }),
    );
  });

});
