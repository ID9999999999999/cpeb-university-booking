import { BadRequestException, ConflictException } from '@nestjs/common';
import { EquipmentStatus, MaintenanceStatus } from '@prisma/client';
import { MaintenanceService } from './maintenance.service';

describe('MaintenanceService', () => {
  const prisma = {
    equipment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    booking: { findFirst: jest.fn() },
    maintenanceRecord: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };

  let service: MaintenanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MaintenanceService(prisma as any);
  });

  it('rejects maintenance that overlaps an active booking', async () => {
    prisma.equipment.findUnique.mockResolvedValue({ id: 'e1' });
    prisma.booking.findFirst.mockResolvedValue({ id: 'b1' });
    prisma.maintenanceRecord.findFirst.mockResolvedValue(null);

    await expect(
      service.createMaintenance({
        equipmentId: 'e1',
        title: 'Inspection',
        startTime: '2030-01-01T10:00:00.000Z',
        endTime: '2030-01-01T11:00:00.000Z',
        actorId: 'admin1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.maintenanceRecord.create).not.toHaveBeenCalled();
  });

  it('activates maintenance and marks equipment under maintenance', async () => {
    prisma.maintenanceRecord.findUnique.mockResolvedValue({
      id: 'm1',
      equipmentId: 'e1',
      status: MaintenanceStatus.SCHEDULED,
    });
    prisma.maintenanceRecord.update.mockResolvedValue({
      id: 'm1',
      equipmentId: 'e1',
      status: MaintenanceStatus.ACTIVE,
      equipment: { id: 'e1' },
    });
    prisma.equipment.update.mockResolvedValue({ id: 'e1' });
    prisma.auditLog.create.mockResolvedValue({ id: 'a1' });

    await service.updateStatus({
      maintenanceId: 'm1',
      status: MaintenanceStatus.ACTIVE,
      actorId: 'admin1',
    });

    expect(prisma.equipment.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { status: EquipmentStatus.UNDER_MAINTENANCE },
    });
  });

  it('rejects an invalid maintenance state transition', async () => {
    prisma.maintenanceRecord.findUnique.mockResolvedValue({
      id: 'm1',
      equipmentId: 'e1',
      status: MaintenanceStatus.COMPLETED,
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
