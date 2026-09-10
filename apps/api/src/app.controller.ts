import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AuthService } from './auth/auth.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  getRoot() {
    return {
      message: 'University Equipment Booking API',
      status: 'running',
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'university-equipment-booking-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('db-health')
  async getDatabaseHealth() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      database: 'connected',
      provider: 'postgresql',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  async getReadiness() {
    await this.prisma.$queryRaw`SELECT 1`;
    const resourceCount = await this.prisma.equipment.count();
    if (resourceCount < 1) {
      throw new ServiceUnavailableException('No university resources are loaded');
    }

    const mail = await this.authService.checkMailReadiness();

    return {
      status: 'ready',
      database: 'connected',
      resources: resourceCount,
      emailVerification: mail.mode,
      mailTransport: mail.connected ? 'connected' : 'unavailable',
      timestamp: new Date().toISOString(),
    };
  }
}
