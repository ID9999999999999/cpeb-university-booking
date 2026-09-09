import { ConflictException } from '@nestjs/common';
import { EquipmentStatus, MaintenanceStatus } from '@prisma/client';
import { EquipmentService } from './equipment.service';

describe('EquipmentService hardening', () => {
  const prisma = {
    equipment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    maintenanceRecord: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  let service: EquipmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EquipmentService(prisma as any);
  });

  it('returns equipment detail without loading unrelated operational relations', async () => {
    prisma.equipment.findUnique.mockResolvedValue({
      id: 'e1',
      name: 'Camera',
      status: EquipmentStatus.AVAILABLE,
    });

    await service.findOne('e1');

    expect(prisma.equipment.findUnique).toHaveBeenCalledWith({
      where: { id: 'e1' },
    });
  });

  it('rejects AVAILABLE while active maintenance exists', async () => {
    prisma.equipment.findUnique.mockResolvedValue({
      id: 'e1',
      status: EquipmentStatus.UNDER_MAINTENANCE,
    });
    prisma.maintenanceRecord.findFirst.mockResolvedValue({
      id: 'm1',
      status: MaintenanceStatus.ACTIVE,
    });

    await expect(
      service.updateStatus({
        equipmentId: 'e1',
        status: EquipmentStatus.AVAILABLE,
        actorId: 'admin1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.equipment.update).not.toHaveBeenCalled();
  });
});
