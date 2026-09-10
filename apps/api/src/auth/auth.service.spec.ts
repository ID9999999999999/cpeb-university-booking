import { BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService deep validation', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue('jwt') };
    service = new AuthService(prisma, jwtService);
  });

  it('rejects malformed registration before database access', async () => {
    await expect(
      service.register({
        fullName: undefined as any,
        studentId: 'STU-1',
        email: 'student@example.com',
        password: 'Password123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects malformed student ids before database access', async () => {
    await expect(
      service.register({
        fullName: 'Student',
        studentId: 'bad id with spaces',
        email: 'student@example.com',
        password: 'Password123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('does not let re-registration replace an unverified account password', async () => {
    const hash = await bcrypt.hash('OriginalPassword123!', 4);
    const existing = {
      id: 'u1',
      fullName: 'Student',
      studentId: 'STU-1',
      email: 'student@example.com',
      password: hash,
      role: 'STUDENT',
      isActive: true,
      emailVerified: false,
      verificationCodeHash: 'hash',
      verificationCodeExpiresAt: new Date(Date.now() + 60_000),
      verificationFailedAttempts: 0,
      verificationResendAvailableAt: new Date(Date.now() + 60_000),
      failedLoginAttempts: 0,
      loginLockedUntil: null,
    };
    prisma.user.findUnique
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);

    await expect(
      service.register({
        fullName: 'Attacker Rename',
        studentId: 'STU-1',
        email: 'student@example.com',
        password: 'DifferentPassword123!',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects malformed verification codes before database access', async () => {
    await expect(
      service.verifyEmail({ email: 'student@example.com', code: '12' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
