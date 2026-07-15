import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

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
}