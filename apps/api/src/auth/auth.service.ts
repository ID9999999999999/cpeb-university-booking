import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { randomInt } from 'crypto';

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 10 * 60 * 1000;
const VERIFICATION_REPLAY_MS = 2 * 60 * 1000;

@Injectable()
export class AuthService {
  private verificationTransport?: ReturnType<typeof nodemailer.createTransport>;
  private mailVerifiedAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private requireString(value: unknown, message: string) {
    if (typeof value !== 'string') {
      throw new BadRequestException(message);
    }
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }
    return normalized;
  }

  private normalizeEmail(value: unknown) {
    const email = this.requireString(value, 'Invalid email address').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new BadRequestException('Invalid email address');
    }
    return email;
  }

  private normalizeStudentId(value: unknown) {
    const studentId = this.requireString(value, 'Invalid student ID').toUpperCase();
    if (
      studentId.length < 2 ||
      studentId.length > 64 ||
      !/^[A-Z0-9._\/-]+$/.test(studentId)
    ) {
      throw new BadRequestException('Invalid student ID');
    }
    return studentId;
  }

  private validatePassword(value: unknown) {
    if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
      throw new BadRequestException('Password must contain 8 to 128 characters');
    }
    return value;
  }

  private validateLoginPassword(value: unknown) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 128) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return value;
  }

  private validateVerificationCode(value: unknown) {
    const code = this.requireString(value, 'Invalid verification code');
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Invalid verification code');
    }
    return code;
  }

  private createCode() {
    return randomInt(100000, 1000000).toString();
  }

  private developmentCodeAllowed() {
    const environment = process.env.NODE_ENV;
    return (
      (environment === 'development' || environment === 'test') &&
      process.env.CPEB_DEV_SHOW_VERIFICATION_CODE === 'true'
    );
  }

  private mailTransport() {
    if (this.verificationTransport) return this.verificationTransport;

    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASSWORD;
    const from = process.env.MAIL_FROM?.trim() || user;

    const placeholder = (value?: string) => {
      const normalized = value?.trim().toLowerCase() ?? '';
      return (
        !normalized ||
        normalized.includes('example.com') ||
        normalized.includes('your-') ||
        normalized.includes('your_') ||
        normalized.includes('replace-with') ||
        normalized.includes('changeme')
      );
    };

    if (
      placeholder(host) ||
      placeholder(user) ||
      placeholder(pass) ||
      placeholder(from) ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new ServiceUnavailableException('Email service is not configured');
    }

    const secure =
      process.env.SMTP_SECURE === 'true' ||
      (process.env.SMTP_SECURE !== 'false' && port === 465);

    const connectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000);
    const socketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000);

    this.verificationTransport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: Number.isFinite(connectionTimeout) ? connectionTimeout : 10000,
      greetingTimeout: Number.isFinite(connectionTimeout) ? connectionTimeout : 10000,
      socketTimeout: Number.isFinite(socketTimeout) ? socketTimeout : 15000,
    });

    return this.verificationTransport;
  }

  async checkMailReadiness() {
    if (this.developmentCodeAllowed()) {
      return { mode: 'explicit-development-code', connected: true };
    }

    if (Date.now() - this.mailVerifiedAt < 30_000) {
      return { mode: 'smtp', connected: true };
    }

    try {
      await this.mailTransport().verify();
      this.mailVerifiedAt = Date.now();
      return { mode: 'smtp', connected: true };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        'Email verification service is not reachable',
      );
    }
  }

  private async sendVerificationEmail(email: string, code: string) {
    const from = process.env.MAIL_FROM?.trim() || process.env.SMTP_USER?.trim();
    if (!from) {
      throw new ServiceUnavailableException('Email service is not configured');
    }

    const transport = this.mailTransport();
    await transport.sendMail({
      from,
      to: email,
      subject: 'CPEB email verification code',
      text: `Your CPEB verification code is ${code}. It expires in 10 minutes. If you did not request this code, ignore this message.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#071b44">
          <h2>CPEB email verification</h2>
          <p>Use this code to activate your university booking account:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:18px 0">${code}</div>
          <p>This code expires in 10 minutes.</p>
          <p style="color:#66758d;font-size:12px">If you did not request this code, you can ignore this email.</p>
        </div>
      `,
    });
  }

  private async issueVerificationCode(userId: string, email: string) {
    const code = this.createCode();
    const verificationCodeHash = await bcrypt.hash(code, 10);
    const now = Date.now();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationCodeHash,
        verificationCodeExpiresAt: new Date(now + VERIFICATION_TTL_MS),
        verificationFailedAttempts: 0,
        verificationResendAvailableAt: new Date(now + VERIFICATION_RESEND_COOLDOWN_MS),
      },
    });

    try {
      await this.sendVerificationEmail(email, code);
      return undefined;
    } catch (error) {
      if (this.developmentCodeAllowed()) {
        return code;
      }

      // Keep the just-issued hash until its normal expiry. SMTP clients can time
      // out after a provider accepted a message; clearing the hash here would
      // make a legitimately delivered code unusable. Allow an immediate resend
      // instead, so a retry can issue a fresh code without deleting the account.
      await this.prisma.user.update({
        where: { id: userId },
        data: { verificationResendAvailableAt: null },
      });

      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Email verification service is unavailable');
    }
  }

  private verificationResponse(email: string, developmentVerificationCode?: string) {
    return {
      requiresVerification: true,
      email,
      message: developmentVerificationCode
        ? 'Verification code generated for explicit local development mode'
        : 'Verification code sent',
      ...(developmentVerificationCode ? { developmentVerificationCode } : {}),
    };
  }

  async register(input: {
    fullName: string;
    studentId: string;
    email: string;
    password: string;
  }) {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('Invalid registration information');
    }

    const email = this.normalizeEmail(input.email);
    const fullName = this.requireString(input.fullName, 'Invalid registration information');
    const studentId = this.normalizeStudentId(input.studentId);
    const password = this.validatePassword(input.password);

    const [existingByEmail, existingByStudentId] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.user.findUnique({ where: { studentId } }),
    ]);

    if (existingByStudentId && existingByStudentId.email !== email) {
      throw new ConflictException('Student ID is already registered');
    }

    if (existingByEmail?.emailVerified) {
      throw new ConflictException('Email is already registered');
    }

    if (existingByEmail && !existingByEmail.emailVerified) {
      const samePassword = await bcrypt.compare(password, existingByEmail.password);
      if (!samePassword) {
        throw new ConflictException('Account is already awaiting email verification');
      }
      if (existingByEmail.studentId && existingByEmail.studentId !== studentId) {
        throw new ConflictException('Account is already linked to another student ID');
      }

      await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: { fullName, studentId, isActive: true },
      });

      if (
        existingByEmail.verificationResendAvailableAt &&
        existingByEmail.verificationResendAvailableAt.getTime() > Date.now() &&
        existingByEmail.verificationCodeHash &&
        existingByEmail.verificationCodeExpiresAt &&
        existingByEmail.verificationCodeExpiresAt.getTime() > Date.now()
      ) {
        return {
          requiresVerification: true,
          email,
          message: 'A verification code was already sent. Use that code or wait before resending.',
        };
      }

      const developmentVerificationCode = await this.issueVerificationCode(
        existingByEmail.id,
        email,
      );
      return this.verificationResponse(email, developmentVerificationCode);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    let user: { id: string; email: string };

    try {
      user = await this.prisma.user.create({
        data: {
          fullName,
          studentId,
          email,
          password: hashedPassword,
          role: 'STUDENT',
          isActive: true,
          emailVerified: false,
        },
        select: { id: true, email: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email or student ID is already registered');
      }
      throw error;
    }

    const developmentVerificationCode = await this.issueVerificationCode(
      user.id,
      user.email,
    );
    return this.verificationResponse(user.email, developmentVerificationCode);
  }

  async verifyEmail(input: { email: string; code: string }) {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('Invalid verification request');
    }

    const email = this.normalizeEmail(input.email);
    const code = this.validateVerificationCode(input.code);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.verificationCodeHash || !user.verificationCodeExpiresAt) {
      throw new BadRequestException('Invalid verification request');
    }

    // Verification is briefly replay-safe. If the server committed verification
    // but the phone lost the response, submitting the same still-valid code can
    // obtain the authentication response again instead of trapping the user.
    if (user.emailVerified) {
      if (user.verificationCodeExpiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('Invalid verification request');
      }
      const replayValid = await bcrypt.compare(code, user.verificationCodeHash);
      if (!replayValid) {
        throw new BadRequestException('Invalid verification request');
      }
      return this.createAuthenticationResponse(user);
    }

    if (user.verificationFailedAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      throw new HttpException(
        'Too many incorrect codes. Request a new verification code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (user.verificationCodeExpiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Verification code has expired');
    }

    const valid = await bcrypt.compare(code, user.verificationCodeHash);
    if (!valid) {
      const failed = await this.prisma.user.update({
        where: { id: user.id },
        data: { verificationFailedAttempts: { increment: 1 } },
        select: { verificationFailedAttempts: true },
      });

      if (failed.verificationFailedAttempts >= MAX_VERIFICATION_ATTEMPTS) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            verificationCodeHash: null,
            verificationCodeExpiresAt: null,
            verificationResendAvailableAt: null,
          },
        });
        throw new HttpException(
          'Too many incorrect codes. Request a new verification code.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new BadRequestException('Invalid verification code');
    }

    const replayUntil = new Date(
      Math.min(
        user.verificationCodeExpiresAt.getTime(),
        Date.now() + VERIFICATION_REPLAY_MS,
      ),
    );
    const verifiedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        // Keep only a short replay window so a lost HTTP response can be retried.
        verificationCodeExpiresAt: replayUntil,
        verificationFailedAttempts: 0,
        verificationResendAvailableAt: null,
      },
    });

    return this.createAuthenticationResponse(verifiedUser);
  }

  async resendVerification(input: { email: string }) {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('Invalid verification request');
    }

    const email = this.normalizeEmail(input.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.emailVerified || !user.isActive) {
      return { message: 'If the account is awaiting verification, a code was sent' };
    }

    if (
      user.verificationResendAvailableAt &&
      user.verificationResendAvailableAt.getTime() > Date.now()
    ) {
      const seconds = Math.max(
        1,
        Math.ceil((user.verificationResendAvailableAt.getTime() - Date.now()) / 1000),
      );
      throw new HttpException(
        `Please wait ${seconds} seconds before requesting another code`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const developmentVerificationCode = await this.issueVerificationCode(user.id, user.email);
    return {
      message: developmentVerificationCode
        ? 'Verification code generated for explicit local development mode'
        : 'Verification code sent',
      ...(developmentVerificationCode ? { developmentVerificationCode } : {}),
    };
  }

  async login(input: { email: string; password: string }) {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('Invalid login information');
    }

    const email = this.normalizeEmail(input.email);
    const password = this.validateLoginPassword(input.password);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.loginLockedUntil && user.loginLockedUntil.getTime() > Date.now()) {
      throw new HttpException(
        'Too many failed sign-in attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) {
      const failed = await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true },
      });
      const locked = failed.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS;
      if (locked) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            loginLockedUntil: new Date(Date.now() + LOGIN_LOCK_MS),
          },
        });
        throw new HttpException(
          'Too many failed sign-in attempts. Try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Email verification is required');
    }

    if (
      user.failedLoginAttempts !== 0 ||
      user.loginLockedUntil ||
      user.verificationCodeHash ||
      user.verificationCodeExpiresAt
    ) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          loginLockedUntil: null,
          verificationCodeHash: null,
          verificationCodeExpiresAt: null,
          verificationFailedAttempts: 0,
          verificationResendAvailableAt: null,
        },
      });
    }

    return this.createAuthenticationResponse(user);
  }

  private async createAuthenticationResponse(user: {
    id: string;
    fullName: string;
    studentId: string | null;
    email: string;
    role: string;
  }) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        studentId: user.studentId,
        email: user.email,
        role: user.role,
      },
    };
  }
}
