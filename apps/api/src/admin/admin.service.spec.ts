import { ConflictException, ForbiddenException } from '@nestjs/common';
import { RepairTicketStatus, UserRole } from '@prisma/client';
import { AdminService } from './admin.service';

describe('AdminService privilege and state protections', () => {
  let tx: any;
  let prisma: any;
  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
      user: {
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      booking: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
      },
      equipment: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      maintenanceRecord: { findFirst: jest.fn() },
      repairTicket: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    prisma = {
      ...tx,
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    service = new AdminService(prisma);
  });

  it('protects the last active administrator', async () => {
    tx.user.findUnique.mockResolvedValue({
      id: 'admin1',
      role: UserRole.ADMIN,
      isActive: true,
    });
    tx.user.count.mockResolvedValue(0);

    await expect(
      service.updateUser('admin2', 'admin1', { isActive: false }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('prevents technicians from changing unassigned repair tickets', async () => {
    tx.repairTicket.findUnique.mockResolvedValue({
      id: 'r1',
      equipmentId: 'e1',
      technicianId: 'tech-other',
      status: RepairTicketStatus.DIAGNOSING,
      diagnosis: null,
    });

    await expect(
      service.reportStatus(
        { id: 'tech1', role: UserRole.TECHNICIAN },
        'r1',
        RepairTicketStatus.READY_FOR_TEST,
        'Checked',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents technicians from closing resolved tickets', async () => {
    tx.repairTicket.findUnique.mockResolvedValue({
      id: 'r1',
      equipmentId: 'e1',
      technicianId: 'tech1',
      status: RepairTicketStatus.RESOLVED,
      diagnosis: 'Fixed',
    });

    await expect(
      service.reportStatus(
        { id: 'tech1', role: UserRole.TECHNICIAN },
        'r1',
        RepairTicketStatus.CLOSED,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
