import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { EquipmentStatus } from '@prisma/client';
import { EquipmentService } from './equipment.service';

@Controller('equipment')
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

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.equipmentService.updateStatus({
      equipmentId: id,
      status: body.status as EquipmentStatus,
      actorId: body.actorId,
    });
  }
}