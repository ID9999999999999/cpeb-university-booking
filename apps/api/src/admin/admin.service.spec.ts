import { BadRequestException, ConflictException } from '@nestjs/common';
import { BookingStatus, EquipmentStatus } from '@prisma/client';
import { AdminService } from './admin.service';

describe('AdminService booking transitions', () => {
  const prisma = {
    booking: { findUnique: jest.fn(), update: jest.fn() },
    equipment: { findUnique: jest.fn(), update: jest.fn() },
    maintenanceRecord: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(prisma as any);
  });

  it('rejects repeated approval', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b1', equipmentId: 'e1', status: BookingStatus.APPROVED,
    });

    await expect(
      service.bookingStatus('admin1', 'b1', BookingStatus.APPROVED, 'BOOKING_APPROVED'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('allows PENDING to APPROVED and records the audit event', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b1', equipmentId: 'e1', status: BookingStatus.PENDING,
    });
    prisma.booking.update.mockResolvedValue({
      id: 'b1', equipmentId: 'e1', status: BookingStatus.APPROVED,
      equipment: { id: 'e1' }, user: { id: 'u1' },
    });
    prisma.auditLog.create.mockResolvedValue({ id: 'a1' });

    const result = await service.bookingStatus(
      'admin1', 'b1', BookingStatus.APPROVED, 'BOOKING_APPROVED',
    );

    expect(result.status).toBe(BookingStatus.APPROVED);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'BOOKING_APPROVED', bookingId: 'b1' }),
      }),
    );
  });

  it('allows CHECKED_OUT to RETURNED', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b2',
      equipmentId: 'e1',
      status: BookingStatus.CHECKED_OUT,
    });
    prisma.booking.update.mockResolvedValue({
      id: 'b2',
      equipmentId: 'e1',
      status: BookingStatus.RETURNED,
      equipment: { id: 'e1' },
      user: { id: 'u1' },
    });
    prisma.auditLog.create.mockResolvedValue({ id: 'a2' });

    const result = await service.bookingStatus(
      'admin1',
      'b2',
      BookingStatus.RETURNED,
      'BOOKING_RETURNED',
    );

    expect(result.status).toBe(BookingStatus.RETURNED);
  });

  it('does not mark equipment available while maintenance is active', async () => {
    prisma.equipment.findUnique.mockResolvedValue({
      id: 'e1',
      status: EquipmentStatus.UNDER_MAINTENANCE,
    });
    prisma.maintenanceRecord.findFirst.mockResolvedValue({ id: 'm1' });

    await expect(
      service.equipmentStatus('admin1', 'e1', EquipmentStatus.AVAILABLE),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.equipment.update).not.toHaveBeenCalled();
  });

});
