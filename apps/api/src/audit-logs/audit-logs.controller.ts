import { Controller, Get, Param } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll() {
    return this.auditLogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditLogsService.findOne(id);
  }

  @Get('equipment/:equipmentId')
  findByEquipment(@Param('equipmentId') equipmentId: string) {
    return this.auditLogsService.findByEquipment(equipmentId);
  }

  @Get('booking/:bookingId')
  findByBooking(@Param('bookingId') bookingId: string) {
    return this.auditLogsService.findByBooking(bookingId);
  }
}