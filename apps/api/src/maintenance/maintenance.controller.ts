import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateMaintenanceDto, MaintenanceStatusDto } from './maintenance.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('Maintenance')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}
  @Get() findAll() { return this.maintenanceService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.maintenanceService.findOne(id); }
  @Post() createMaintenance(@Body() body: CreateMaintenanceDto) {
    return this.maintenanceService.createMaintenance({ equipmentId: body.equipmentId, title: body.title, description: body.description, startTime: body.startTime, endTime: body.endTime, status: body.status, actorId: body.actorId });
  }
  @Patch(':id/status') updateStatus(@Param('id') id: string, @Body() body: MaintenanceStatusDto) {
    return this.maintenanceService.updateStatus({ maintenanceId: id, status: body.status, actorId: body.actorId });
  }
}
