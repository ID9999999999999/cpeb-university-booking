import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RepairTicketsService } from './repair-tickets.service';

describe('RepairTicketsService', () => {
  let prisma: any;
  let tx: any;
  let service: RepairTicketsService;

  beforeEach(() => {
    tx = {
      equipment: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      repairTicket: { create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    prisma = {
      repairTicket: { findMany: jest.fn(), findFirst: jest.fn() },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    service = new RepairTicketsService(prisma);
  });

  it('creates ticket and audit atomically for a verified active reporter', async () => {
    tx.equipment.findUnique.mockResolvedValue({ id: 'e1' });
    tx.user.findUnique.mockResolvedValue({
      id: 'u1',
      isActive: true,
      emailVerified: true,
    });
    tx.repairTicket.create.mockResolvedValue({
      id: 'r1',
      equipmentId: 'e1',
      reporterId: 'u1',
      title: 'Camera fault',
      evidenceUrl: null,
      equipment: { id: 'e1' },
    });

    const result = await service.create({
      equipmentId: 'e1',
      reporterId: 'u1',
      title: 'Camera fault',
    });

    expect(result.id).toBe('r1');
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'REPAIR_TICKET_CREATED',
          actorId: 'u1',
          entityId: 'r1',
        }),
      }),
    );
  });

  it('rejects an inactive or unverified reporter', async () => {
    tx.equipment.findUnique.mockResolvedValue({ id: 'e1' });
    tx.user.findUnique.mockResolvedValue({
      id: 'u1',
      isActive: true,
      emailVerified: false,
    });

    await expect(
      service.create({
        equipmentId: 'e1',
        reporterId: 'u1',
        title: 'Fault',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.repairTicket.create).not.toHaveBeenCalled();
  });

  it('does not return another user repair ticket', async () => {
    prisma.repairTicket.findFirst.mockResolvedValue(null);
    await expect(service.findOne('r1', 'u2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
