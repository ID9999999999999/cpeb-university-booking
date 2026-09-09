import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    if (!ticket) {
      throw new NotFoundException('Repair ticket not found');
    }

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
    if (!title) {
      throw new BadRequestException('Title required');
    }

    const equipment = await this.prisma.equipment.findUnique({
      where: { id: input.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException('Resource not found');
    }

    const ticket = await this.prisma.repairTicket.create({
      data: {
        equipmentId: input.equipmentId,
        reporterId: input.reporterId,
        title,
        description: input.description?.trim() || undefined,
        evidenceUrl: input.evidenceUrl?.trim() || undefined,
      },
      include: { equipment: true },
    });

    await this.prisma.auditLog.create({
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
  }
}
