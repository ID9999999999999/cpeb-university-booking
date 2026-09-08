import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { randomInt } from 'crypto';

@Injectable()
export class AuthService {
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

    if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
      throw new BadRequestException('Invalid email address');
    }

    return email;
  }

  private validatePassword(value: unknown) {
    if (typeof value !== 'string' || value.length < 6) {
      throw new BadRequestException('Invalid password');
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

  private async sendVerificationEmail(email: string, code: string) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const from = process.env.MAIL_FROM || user;

    if (!host || !user || !pass || !from) {
      throw new ServiceUnavailableException(
        'Email service is not configured',
      );
    }

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transport.sendMail({
      from,
      to: email,
      subject: 'CPEB email verification code',
      text: `Your CPEB verification code is ${code}. It expires in 10 minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
          <h2>CPEB email verification</h2>
          <p>Use this code to activate your account:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</div>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });
  }

  private async issueVerificationCode(userId: string, email: string) {
    const code = this.createCode();
    const verificationCodeHash = await bcrypt.hash(code, 10);
    const verificationCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationCodeHash,
        verificationCodeExpiresAt,
      },
    });

    try {
      await this.sendVerificationEmail(email, code);
    } catch (error) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          verificationCodeHash: null,
          verificationCodeExpiresAt: null,
        },
      });
      throw error;
    }
  }

  async register(input: {
    fullName: string;
    email: string;
    password: string;
  }) {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('Invalid registration information');
    }

    const email = this.normalizeEmail(input.email);
    const fullName = this.requireString(
      input.fullName,
      'Invalid registration information',
    );
    const password = this.validatePassword(input.password);

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser?.emailVerified) {
      throw new ConflictException('Email is already registered');
    }

    if (existingUser && !existingUser.emailVerified) {
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          fullName,
          password: hashedPassword,
          isActive: true,
        },
      });

      await this.issueVerificationCode(user.id, user.email);
      return {
        requiresVerification: true,
        email: user.email,
        message: 'Verification code sent',
      };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role: 'STUDENT',
        isActive: true,
        emailVerified: false,
      },
    });

    try {
      await this.issueVerificationCode(user.id, user.email);
    } catch (error) {
      await this.prisma.user.delete({ where: { id: user.id } });
      throw error;
    }

    return {
      requiresVerification: true,
      email: user.email,
      message: 'Verification code sent',
    };
  }

  async verifyEmail(input: { email: string; code: string }) {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('Invalid verification request');
    }

    const email = this.normalizeEmail(input.email);
    const code = this.validateVerificationCode(input.code);

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (
      !user ||
      user.emailVerified ||
      !user.verificationCodeHash ||
      !user.verificationCodeExpiresAt
    ) {
      throw new BadRequestException('Invalid verification request');
    }

    if (user.verificationCodeExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Verification code has expired');
    }

    const valid = await bcrypt.compare(code, user.verificationCodeHash);
    if (!valid) {
      throw new BadRequestException('Invalid verification code');
    }

    const verifiedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCodeHash: null,
        verificationCodeExpiresAt: null,
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

    if (!user) {
      return { message: 'If the account exists, a code was sent' };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.issueVerificationCode(user.id, user.email);
    return { message: 'Verification code sent' };
  }

  async login(input: { email: string; password: string }) {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('Invalid login information');
    }

    const email = this.normalizeEmail(input.email);
    const password = this.validatePassword(input.password);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordIsValid = await bcrypt.compare(
      password,
      user.password,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Email verification is required');
    }

    return this.createAuthenticationResponse(user);
  }

  private async createAuthenticationResponse(user: {
    id: string;
    fullName: string;
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
        email: user.email,
        role: user.role,
      },
    };
  }
}
