import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService input validation', () => {
  let service: AuthService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    const jwtService = {
      signAsync: jest.fn(),
    };

    service = new AuthService(prisma, jwtService as any);
  });

  it('rejects a malformed registration body before database access', async () => {
    await expect(
      service.register({
        fullName: undefined as any,
        email: 'student@example.com',
        password: 'secret',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an invalid email before database access', async () => {
    await expect(
      service.register({
        fullName: 'Student',
        email: 'not-an-email',
        password: 'secret',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a missing login password before database access', async () => {
    await expect(
      service.login({
        email: 'student@example.com',
        password: undefined as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a malformed verification code before database access', async () => {
    await expect(
      service.verifyEmail({
        email: 'student@example.com',
        code: '12',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
