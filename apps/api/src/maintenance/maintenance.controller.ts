import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateMaintenanceDto, MaintenanceStatusDto } from './maintenance.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN, UserRole.LAB_MANAGER, UserRole.TECHNICIAN)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  private actor(request: any) {
    return request.user?.id ?? request.user?.userId ?? request.user?.sub;
  }

  @Get()
  findAll() {
    return this.maintenanceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.maintenanceService.findOne(id);
  }

  @Post()
  createMaintenance(@Request() request: any, @Body() body: CreateMaintenanceDto) {
    return this.maintenanceService.createMaintenance({
      equipmentId: body.equipmentId,
      title: body.title,
      description: body.description,
      startTime: body.startTime,
      endTime: body.endTime,
      actorId: this.actor(request),
    });
  }

  @Patch(':id/status')
  updateStatus(
    @Request() request: any,
    @Param('id') id: string,
    @Body() body: MaintenanceStatusDto,
  ) {
    return this.maintenanceService.updateStatus({
      maintenanceId: id,
      status: body.status,
      actorId: this.actor(request),
    });
  }
}
