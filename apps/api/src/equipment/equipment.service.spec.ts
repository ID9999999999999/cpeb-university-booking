import { BadRequestException, ConflictException } from '@nestjs/common';
import { BookingStatus, EquipmentStatus } from '@prisma/client';
import { EquipmentService } from './equipment.service';

describe('EquipmentService consistency', () => {
  let prisma: any;
  let tx: any;
  let service: EquipmentService;

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
      equipment: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      booking: { findFirst: jest.fn() },
      maintenanceRecord: { findFirst: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    prisma = {
      equipment: { findMany: jest.fn(), findUnique: jest.fn() },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    service = new EquipmentService(prisma);
  });

  it('rejects manually forcing CHECKED_OUT because booking owns that state', async () => {
    tx.equipment.findUnique.mockResolvedValue({
      id: 'e1',
      status: EquipmentStatus.AVAILABLE,
    });

    await expect(
      service.updateStatus({
        equipmentId: 'e1',
        status: EquipmentStatus.CHECKED_OUT,
        actorId: 'admin1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not mark equipment AVAILABLE while a checked-out booking exists', async () => {
    tx.equipment.findUnique.mockResolvedValue({
      id: 'e1',
      status: EquipmentStatus.RESERVED,
    });
    tx.booking.findFirst
      .mockResolvedValueOnce({ id: 'b1', status: BookingStatus.CHECKED_OUT })
      .mockResolvedValueOnce({ id: 'b1', status: BookingStatus.CHECKED_OUT });
    tx.maintenanceRecord.findFirst.mockResolvedValue(null);

    await expect(
      service.updateStatus({
        equipmentId: 'e1',
        status: EquipmentStatus.AVAILABLE,
        actorId: 'admin1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a safe manual status atomically and writes its audit event', async () => {
    tx.equipment.findUnique.mockResolvedValue({
      id: 'e1',
      status: EquipmentStatus.RETIRED,
    });
    tx.booking.findFirst.mockResolvedValue(null);
    tx.maintenanceRecord.findFirst.mockResolvedValue(null);
    tx.equipment.updateMany.mockResolvedValue({ count: 1 });
    tx.equipment.findUniqueOrThrow.mockResolvedValue({
      id: 'e1',
      status: EquipmentStatus.AVAILABLE,
    });

    const result = await service.updateStatus({
      equipmentId: 'e1',
      status: EquipmentStatus.AVAILABLE,
      actorId: 'admin1',
    });

    expect(result.equipment.status).toBe(EquipmentStatus.AVAILABLE);
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'EQUIPMENT_STATUS_UPDATED' }),
      }),
    );
  });
});
