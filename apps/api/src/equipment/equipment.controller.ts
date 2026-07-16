import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EquipmentStatus } from '@prisma/client';

import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

import { EquipmentService } from './equipment.service';

@Controller('equipment')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  findAll() {
    return this.equipmentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  createEquipment(@Body() body: any) {
    return this.equipmentService.createEquipment({
      name: body.name,
      category: body.category,
      inventoryTag: body.inventoryTag,
      location: body.location,
      description: body.description,
    });
  }

  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.equipmentService.updateStatus({
      equipmentId: id,
      status: body.status as EquipmentStatus,
      actorId: body.actorId,
    });
  }
}
