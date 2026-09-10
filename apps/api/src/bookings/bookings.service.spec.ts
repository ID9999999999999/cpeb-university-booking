import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { BookingStatus, EquipmentStatus } from '@prisma/client';
import { BookingsService } from './bookings.service';

describe('BookingsService deep consistency', () => {
  let tx: any;
  let prisma: any;
  let service: BookingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
      user: { findUnique: jest.fn() },
      equipment: { findUnique: jest.fn(), updateMany: jest.fn() },
      maintenanceRecord: { findFirst: jest.fn() },
      booking: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      bookingRating: { upsert: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    prisma = {
      ...tx,
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    service = new BookingsService(prisma);
  });

  it('creates a pending booking inside the serialized transaction', async () => {
    tx.user.findUnique.mockResolvedValue({ id: 'u1', isActive: true, emailVerified: true });
    tx.equipment.findUnique.mockResolvedValue({ id: 'e1', status: EquipmentStatus.AVAILABLE });
    tx.maintenanceRecord.findFirst.mockResolvedValue(null);
    tx.booking.findFirst.mockResolvedValue(null);
    tx.booking.create.mockResolvedValue({
      id: 'b1',
      equipmentId: 'e1',
      userId: 'u1',
      status: BookingStatus.PENDING,
      equipment: { id: 'e1' },
      rating: null,
    });
    tx.auditLog.create.mockResolvedValue({ id: 'a1' });

    const result = await service.create({
      equipmentId: 'e1',
      userId: 'u1',
      startTime: '2099-01-01T10:00:00.000Z',
      endTime: '2099-01-01T11:00:00.000Z',
      reason: 'Lab work',
    });

    expect(result.status).toBe(BookingStatus.PENDING);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BookingStatus.PENDING }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it('refuses to finish an approved booking before its start time', async () => {
    tx.booking.findFirst.mockResolvedValue({
      id: 'b1',
      equipmentId: 'e1',
      userId: 'u1',
      status: BookingStatus.APPROVED,
      startTime: new Date(Date.now() + 60_000),
    });

    await expect(service.finish('b1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.booking.updateMany).not.toHaveBeenCalled();
  });

  it('detects a concurrent cancellation state change', async () => {
    tx.booking.findFirst.mockResolvedValue({
      id: 'b1',
      equipmentId: 'e1',
      userId: 'u1',
      status: BookingStatus.PENDING,
      startTime: new Date(Date.now() + 60_000),
    });
    tx.booking.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.cancel('b1', 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns checked-out equipment to available after user finish', async () => {
    tx.booking.findFirst.mockResolvedValue({
      id: 'b2',
      equipmentId: 'e1',
      userId: 'u1',
      status: BookingStatus.CHECKED_OUT,
      startTime: new Date(Date.now() - 60_000),
    });
    tx.booking.updateMany.mockResolvedValue({ count: 1 });
    tx.maintenanceRecord.findFirst.mockResolvedValue(null);
    tx.equipment.updateMany.mockResolvedValue({ count: 1 });
    tx.booking.findUniqueOrThrow.mockResolvedValue({
      id: 'b2',
      equipmentId: 'e1',
      userId: 'u1',
      status: BookingStatus.RETURNED,
      equipment: { id: 'e1' },
      rating: null,
    });
    tx.auditLog.create.mockResolvedValue({ id: 'a1' });

    const result = await service.finish('b2', 'u1');
    expect(result.status).toBe(BookingStatus.RETURNED);
    expect(tx.equipment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: EquipmentStatus.AVAILABLE },
      }),
    );
  });
});
