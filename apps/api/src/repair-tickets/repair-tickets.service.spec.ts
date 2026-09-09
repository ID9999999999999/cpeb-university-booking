import { NotFoundException } from '@nestjs/common';
import { RepairTicketsService } from './repair-tickets.service';

describe('RepairTicketsService', () => {
  const prisma = {
    equipment: { findUnique: jest.fn() },
    repairTicket: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };

  let service: RepairTicketsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RepairTicketsService(prisma as any);
  });

  it('records an audit event when a user creates a repair ticket', async () => {
    prisma.equipment.findUnique.mockResolvedValue({ id: 'e1' });
    prisma.repairTicket.create.mockResolvedValue({
      id: 'r1',
      equipmentId: 'e1',
      reporterId: 'u1',
      title: 'Camera fault',
      evidenceUrl: 'https://example.test/evidence.jpg',
      equipment: { id: 'e1' },
    });
    prisma.auditLog.create.mockResolvedValue({ id: 'a1' });

    await service.create({
      equipmentId: 'e1',
      reporterId: 'u1',
      title: 'Camera fault',
      evidenceUrl: 'https://example.test/evidence.jpg',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'u1',
          action: 'REPAIR_TICKET_CREATED',
          entityId: 'r1',
        }),
      }),
    );
  });

  it('does not return another user repair ticket', async () => {
    prisma.repairTicket.findFirst.mockResolvedValue(null);

    await expect(service.findOne('r1', 'u2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
