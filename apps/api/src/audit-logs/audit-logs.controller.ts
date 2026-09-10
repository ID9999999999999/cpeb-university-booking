import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuditListQueryDto } from './audit-logs.dto';
import { AuditLogsService } from './audit-logs.service';

@ApiTags('Audit logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query() query: AuditListQueryDto) {
    return this.auditLogsService.findAll(query.take ?? 100);
  }

  @Get('equipment/:equipmentId')
  findByEquipment(@Param('equipmentId') equipmentId: string) {
    return this.auditLogsService.findByEquipment(equipmentId);
  }

  @Get('booking/:bookingId')
  findByBooking(@Param('bookingId') bookingId: string) {
    return this.auditLogsService.findByBooking(bookingId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditLogsService.findOne(id);
  }
}
