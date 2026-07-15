import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RepairTicketStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateRepairTicketInput = {
  equipmentId: string;
  technicianId?: string;
  title: string;
  description?: string;
  actorId?: string;
};

type UpdateRepairTicketStatusInput = {
  repairTicketId: string;
  status: RepairTicketStatus;
  diagnosis?: string;
  evidenceUrl?: string;
  actorId?: string;
};

type AssignTechnicianInput = {
  repairTicketId: string;
  technicianId: string;
  actorId?: string;
};

@Injectable()
export class RepairTicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.repairTicket.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        equipment: true,
        technician: true,
      },
    });
  }

  async findOne(id: string) {
    const repairTicket = await this.prisma.repairTicket.findUnique({
      where: { id },
      include: {
        equipment: true,
        technician: true,
      },
    });

    if (!repairTicket) {
      throw new NotFoundException('Repair ticket not found.');
    }

    return repairTicket;
  }

  async createRepairTicket(input: CreateRepairTicketInput) {
    if (!input.equipmentId || !input.title) {
      throw new BadRequestException('equipmentId and title are required.');
    }

    const equipment = await this.prisma.equipment.findUnique({
      where: { id: input.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found.');
    }

    if (input.technicianId) {
      const technician = await this.prisma.user.findUnique({
        where: { id: input.technicianId },
      });

      if (!technician || !technician.isActive) {
        throw new NotFoundException('Active technician not found.');
      }

      if (
        technician.role !== UserRole.TECHNICIAN &&
        technician.role !== UserRole.ADMIN
      ) {
        throw new BadRequestException(
          'Assigned user must be TECHNICIAN or ADMIN.',
        );
      }
    }

    const repairTicket = await this.prisma.repairTicket.create({
      data: {
        equipmentId: input.equipmentId,
        technicianId: input.technicianId,
        title: input.title,
        description: input.description,
      },
      include: {
        equipment: true,
        technician: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        equipmentId: input.equipmentId,
        action: 'REPAIR_TICKET_CREATED',
        entityType: 'REPAIR_TICKET',
        entityId: repairTicket.id,
        metadata: {
          repairTicketId: repairTicket.id,
          equipmentId: input.equipmentId,
          technicianId: input.technicianId ?? null,
          status: repairTicket.status,
        },
      },
    });

    return {
      decision: 'REPAIR_TICKET_CREATED',
      repairTicket,
    };
  }

  async updateStatus(input: UpdateRepairTicketStatusInput) {
    const allowedStatuses = Object.values(RepairTicketStatus);

    if (!allowedStatuses.includes(input.status)) {
      throw new BadRequestException('Invalid repair ticket status.');
    }

    const repairTicket = await this.prisma.repairTicket.findUnique({
      where: { id: input.repairTicketId },
    });

    if (!repairTicket) {
      throw new NotFoundException('Repair ticket not found.');
    }

    const updatedRepairTicket = await this.prisma.repairTicket.update({
      where: { id: input.repairTicketId },
      data: {
        status: input.status,
        diagnosis: input.diagnosis ?? repairTicket.diagnosis,
        evidenceUrl: input.evidenceUrl ?? repairTicket.evidenceUrl,
      },
      include: {
        equipment: true,
        technician: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        equipmentId: updatedRepairTicket.equipmentId,
        action: 'REPAIR_TICKET_STATUS_UPDATED',
        entityType: 'REPAIR_TICKET',
        entityId: input.repairTicketId,
        metadata: {
          repairTicketId: input.repairTicketId,
          equipmentId: updatedRepairTicket.equipmentId,
          previousStatus: repairTicket.status,
          newStatus: input.status,
          diagnosisChanged: input.diagnosis !== undefined,
          evidenceUrlChanged: input.evidenceUrl !== undefined,
        },
      },
    });

    return {
      decision: 'REPAIR_TICKET_STATUS_UPDATED',
      repairTicket: updatedRepairTicket,
    };
  }

  async assignTechnician(input: AssignTechnicianInput) {
    if (!input.technicianId) {
      throw new BadRequestException('technicianId is required.');
    }

    const repairTicket = await this.prisma.repairTicket.findUnique({
      where: { id: input.repairTicketId },
    });

    if (!repairTicket) {
      throw new NotFoundException('Repair ticket not found.');
    }

    const technician = await this.prisma.user.findUnique({
      where: { id: input.technicianId },
    });

    if (!technician || !technician.isActive) {
      throw new NotFoundException('Active technician not found.');
    }

    if (
      technician.role !== UserRole.TECHNICIAN &&
      technician.role !== UserRole.ADMIN
    ) {
      throw new BadRequestException(
        'Assigned user must be TECHNICIAN or ADMIN.',
      );
    }

    const updatedRepairTicket = await this.prisma.repairTicket.update({
      where: { id: input.repairTicketId },
      data: {
        technicianId: input.technicianId,
      },
      include: {
        equipment: true,
        technician: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        equipmentId: updatedRepairTicket.equipmentId,
        action: 'REPAIR_TICKET_ASSIGNED',
        entityType: 'REPAIR_TICKET',
        entityId: input.repairTicketId,
        metadata: {
          repairTicketId: input.repairTicketId,
          equipmentId: updatedRepairTicket.equipmentId,
          previousTechnicianId: repairTicket.technicianId,
          newTechnicianId: input.technicianId,
        },
      },
    });

    return {
      decision: 'REPAIR_TICKET_ASSIGNED',
      repairTicket: updatedRepairTicket,
    };
  }
}