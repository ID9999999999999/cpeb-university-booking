import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateEquipmentDto, EquipmentStatusDto } from './equipment.dto';
import { EquipmentService } from './equipment.service';

@ApiTags('Equipment')
@ApiBearerAuth()
@Controller('equipment')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}
  @Get() findAll() { return this.equipmentService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.equipmentService.findOne(id); }
  @Roles('ADMIN') @Post() createEquipment(@Body() body: CreateEquipmentDto) {
    return this.equipmentService.createEquipment({ name: body.name, category: body.category, inventoryTag: body.inventoryTag, location: body.location, description: body.description });
  }
  @Roles('ADMIN') @Patch(':id/status') updateStatus(@Param('id') id: string, @Body() body: EquipmentStatusDto) {
    return this.equipmentService.updateStatus({ equipmentId: id, status: body.status, actorId: body.actorId });
  }
}
