import { BadRequestException, ConflictException } from '@nestjs/common';
import { EquipmentStatus, MaintenanceStatus } from '@prisma/client';
import { MaintenanceService } from './maintenance.service';

describe('MaintenanceService deep consistency', () => {
  let tx: any;
  let prisma: any;
  let service: MaintenanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
      equipment: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      booking: { findFirst: jest.fn() },
      maintenanceRecord: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    prisma = {
      ...tx,
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    service = new MaintenanceService(prisma);
  });

  it('rejects maintenance that overlaps a booking under the equipment lock', async () => {
    tx.equipment.findUnique.mockResolvedValue({ id: 'e1', status: EquipmentStatus.AVAILABLE });
    tx.booking.findFirst.mockResolvedValue({ id: 'b1' });
    tx.maintenanceRecord.findFirst.mockResolvedValue(null);

    await expect(
      service.createMaintenance({
        equipmentId: 'e1',
        title: 'Inspection',
        startTime: '2099-01-01T10:00:00.000Z',
        endTime: '2099-01-01T11:00:00.000Z',
        actorId: 'admin1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.maintenanceRecord.create).not.toHaveBeenCalled();
  });

  it('activates maintenance and synchronizes equipment state', async () => {
    tx.maintenanceRecord.findUnique.mockResolvedValue({
      id: 'm1',
      equipmentId: 'e1',
      status: MaintenanceStatus.SCHEDULED,
      startTime: new Date('2099-01-01T10:00:00.000Z'),
      endTime: new Date('2099-01-01T11:00:00.000Z'),
    });
    tx.equipment.findUnique.mockResolvedValue({ status: EquipmentStatus.AVAILABLE });
    tx.booking.findFirst.mockResolvedValue(null);
    tx.maintenanceRecord.updateMany.mockResolvedValue({ count: 1 });
    tx.equipment.update.mockResolvedValue({ id: 'e1' });
    tx.maintenanceRecord.findUniqueOrThrow.mockResolvedValue({
      id: 'm1',
      equipmentId: 'e1',
      status: MaintenanceStatus.ACTIVE,
      equipment: { id: 'e1' },
    });
    tx.auditLog.create.mockResolvedValue({ id: 'a1' });

    await service.updateStatus({
      maintenanceId: 'm1',
      status: MaintenanceStatus.ACTIVE,
      actorId: 'admin1',
    });

    expect(tx.equipment.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { status: EquipmentStatus.UNDER_MAINTENANCE },
    });
  });

  it('rejects invalid maintenance transitions', async () => {
    tx.maintenanceRecord.findUnique.mockResolvedValue({
      id: 'm1',
      equipmentId: 'e1',
      status: MaintenanceStatus.COMPLETED,
      startTime: new Date('2099-01-01T10:00:00.000Z'),
      endTime: new Date('2099-01-01T11:00:00.000Z'),
    });

    await expect(
      service.updateStatus({
        maintenanceId: 'm1',
        status: MaintenanceStatus.ACTIVE,
        actorId: 'admin1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
