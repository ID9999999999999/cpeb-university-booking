import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.auditLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      include: {
        actor: true,
        equipment: true,
        booking: true,
      },
    });
  }

  async findOne(id: string) {
    const auditLog = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: true,
        equipment: true,
        booking: true,
      },
    });

    if (!auditLog) {
      throw new NotFoundException('Audit log not found.');
    }

    return auditLog;
  }

  async findByEquipment(equipmentId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        equipmentId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        actor: true,
        equipment: true,
        booking: true,
      },
    });
  }

  async findByBooking(bookingId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        bookingId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        actor: true,
        equipment: true,
        booking: true,
      },
    });
  }
}