import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService privacy', () => {
  const prisma = {
    auditLog: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  let service: AuditLogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.auditLog.findMany.mockResolvedValue([]);
    service = new AuditLogsService(prisma as any);
  });

  it('uses a safe actor projection instead of returning the full user record', async () => {
    await service.findAll(25);

    const args = prisma.auditLog.findMany.mock.calls[0][0];
    expect(args.take).toBe(25);
    expect(args.include.actor.select).toEqual(
      expect.objectContaining({
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
      }),
    );
    expect(args.include.actor.select.password).toBeUndefined();
    expect(args.include.actor.select.verificationCodeHash).toBeUndefined();
  });
});
