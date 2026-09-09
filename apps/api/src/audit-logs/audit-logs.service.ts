import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const safeAuditInclude = {
  actor: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
    },
  },
  equipment: {
    select: {
      id: true,
      name: true,
      category: true,
      inventoryTag: true,
      location: true,
      status: true,
    },
  },
  booking: {
    select: {
      id: true,
      equipmentId: true,
      userId: true,
      startTime: true,
      endTime: true,
      status: true,
      reason: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(take = 100) {
    const normalizedTake = Number.isFinite(take)
      ? Math.min(Math.max(Math.trunc(take), 1), 500)
      : 100;

    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: normalizedTake,
      include: safeAuditInclude,
    });
  }

  async findOne(id: string) {
    const auditLog = await this.prisma.auditLog.findUnique({
      where: { id },
      include: safeAuditInclude,
    });

    if (!auditLog) {
      throw new NotFoundException('Audit log not found.');
    }

    return auditLog;
  }

  findByEquipment(equipmentId: string) {
    return this.prisma.auditLog.findMany({
      where: { equipmentId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: safeAuditInclude,
    });
  }

  findByBooking(bookingId: string) {
    return this.prisma.auditLog.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: safeAuditInclude,
    });
  }
}
