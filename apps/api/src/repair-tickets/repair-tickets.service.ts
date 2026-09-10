import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RepairTicketsService {
  constructor(private readonly prisma: PrismaService) {}

  mine(reporterId: string) {
    return this.prisma.repairTicket.findMany({
      where: { reporterId },
      include: { equipment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, reporterId: string) {
    const ticket = await this.prisma.repairTicket.findFirst({
      where: { id, reporterId },
      include: { equipment: true },
    });

    if (!ticket) throw new NotFoundException('Repair ticket not found');
    return ticket;
  }

  async create(input: {
    equipmentId: string;
    reporterId: string;
    title: string;
    description?: string;
    evidenceUrl?: string;
  }) {
    const title = input.title?.trim();
    if (!title) throw new BadRequestException('Title required');

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const [equipment, reporter] = await Promise.all([
        tx.equipment.findUnique({
          where: { id: input.equipmentId },
          select: { id: true },
        }),
        tx.user.findUnique({
          where: { id: input.reporterId },
          select: { id: true, isActive: true, emailVerified: true },
        }),
      ]);

      if (!equipment) throw new NotFoundException('Resource not found');
      if (!reporter || !reporter.isActive || !reporter.emailVerified) {
        throw new BadRequestException('Verified active user required');
      }

      const ticket = await tx.repairTicket.create({
        data: {
          equipmentId: input.equipmentId,
          reporterId: input.reporterId,
          title,
          description: input.description?.trim() || undefined,
          evidenceUrl: input.evidenceUrl?.trim() || undefined,
        },
        include: { equipment: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.reporterId,
          equipmentId: input.equipmentId,
          action: 'REPAIR_TICKET_CREATED',
          entityType: 'REPAIR_TICKET',
          entityId: ticket.id,
          metadata: {
            title: ticket.title,
            hasEvidence: Boolean(ticket.evidenceUrl),
          },
        },
      });

      return ticket;
    });
  }
}
