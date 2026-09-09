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
import { CreateEquipmentDto, EquipmentStatusDto } from './equipment.dto';
import { EquipmentService } from './equipment.service';

@ApiTags('Equipment')
@ApiBearerAuth()
@Controller('equipment')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  private actor(request: any) {
    return request.user?.id ?? request.user?.userId ?? request.user?.sub;
  }

  @Get()
  findAll() {
    return this.equipmentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  createEquipment(@Request() request: any, @Body() body: CreateEquipmentDto) {
    return this.equipmentService.createEquipment({
      name: body.name,
      category: body.category,
      inventoryTag: body.inventoryTag,
      location: body.location,
      description: body.description,
      actorId: this.actor(request),
    });
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/status')
  updateStatus(
    @Request() request: any,
    @Param('id') id: string,
    @Body() body: EquipmentStatusDto,
  ) {
    return this.equipmentService.updateStatus({
      equipmentId: id,
      status: body.status,
      actorId: this.actor(request),
    });
  }
}
