import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { RepairTicketStatus } from '@prisma/client';
import { RepairTicketsService } from './repair-tickets.service';

@Controller('repair-tickets')
export class RepairTicketsController {
  constructor(private readonly repairTicketsService: RepairTicketsService) {}

  @Get()
  findAll() {
    return this.repairTicketsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.repairTicketsService.findOne(id);
  }

  @Post()
  createRepairTicket(@Body() body: any) {
    return this.repairTicketsService.createRepairTicket({
      equipmentId: body.equipmentId,
      technicianId: body.technicianId,
      title: body.title,
      description: body.description,
      actorId: body.actorId,
    });
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.repairTicketsService.updateStatus({
      repairTicketId: id,
      status: body.status as RepairTicketStatus,
      diagnosis: body.diagnosis,
      evidenceUrl: body.evidenceUrl,
      actorId: body.actorId,
    });
  }

  @Patch(':id/assign')
  assignTechnician(@Param('id') id: string, @Body() body: any) {
    return this.repairTicketsService.assignTechnician({
      repairTicketId: id,
      technicianId: body.technicianId,
      actorId: body.actorId,
    });
  }
}