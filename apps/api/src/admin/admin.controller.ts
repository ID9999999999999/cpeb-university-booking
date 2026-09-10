import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BookingStatus, UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  AdminCreateEquipmentDto,
  AdminCreateMaintenanceDto,
  AdminEquipmentStatusDto,
  AdminMaintenanceStatusDto,
  AssignReportDto,
  AuditQueryDto,
  BookingsQueryDto,
  EquipmentQueryDto,
  MaintenanceQueryDto,
  RejectBookingDto,
  ReportsQueryDto,
  ReportStatusDto,
  UpdateUserDto,
  UsersQueryDto,
} from './admin.dto';
import { AdminService } from './admin.service';

@ApiTags('Administration')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  private actor(request: any) {
    return {
      id: request.user?.id ?? request.user?.userId ?? request.user?.sub,
      role: request.user?.role as UserRole,
    };
  }

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER, UserRole.TECHNICIAN)
  dashboard() {
    return this.service.dashboard();
  }

  @Get('users')
  @Roles(UserRole.ADMIN)
  users(@Query() query: UsersQueryDto) {
    return this.service.users(
      query.role,
      query.active === undefined ? undefined : query.active === 'true',
    );
  }

  @Patch('users/:id')
  @Roles(UserRole.ADMIN)
  updateUser(
    @Request() request: any,
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.service.updateUser(this.actor(request).id, id, body);
  }

  @Get('bookings')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER)
  bookings(@Query() query: BookingsQueryDto) {
    return this.service.bookings(query.status);
  }

  @Patch('bookings/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER)
  approve(@Request() request: any, @Param('id') id: string) {
    return this.service.bookingStatus(
      this.actor(request).id,
      id,
      BookingStatus.APPROVED,
      'BOOKING_APPROVED',
    );
  }

  @Patch('bookings/:id/reject')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER)
  reject(
    @Request() request: any,
    @Param('id') id: string,
    @Body() body: RejectBookingDto,
  ) {
    return this.service.bookingStatus(
      this.actor(request).id,
      id,
      BookingStatus.REJECTED,
      'BOOKING_REJECTED',
      { reason: body.reason ?? null },
    );
  }

  @Patch('bookings/:id/check-out')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER)
  checkout(@Request() request: any, @Param('id') id: string) {
    return this.service.bookingStatus(
      this.actor(request).id,
      id,
      BookingStatus.CHECKED_OUT,
      'BOOKING_CHECKED_OUT',
    );
  }

  @Patch('bookings/:id/return')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER)
  returnBooking(@Request() request: any, @Param('id') id: string) {
    return this.service.bookingStatus(
      this.actor(request).id,
      id,
      BookingStatus.RETURNED,
      'BOOKING_RETURNED',
    );
  }

  @Patch('bookings/:id/close')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER)
  close(@Request() request: any, @Param('id') id: string) {
    return this.service.bookingStatus(
      this.actor(request).id,
      id,
      BookingStatus.CLOSED,
      'BOOKING_CLOSED',
    );
  }

  @Get('equipment')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER, UserRole.TECHNICIAN)
  equipment(@Query() query: EquipmentQueryDto) {
    return this.service.equipment(query.category, query.status);
  }

  @Post('equipment')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER)
  createEquipment(
    @Request() request: any,
    @Body() body: AdminCreateEquipmentDto,
  ) {
    return this.service.createEquipment(this.actor(request).id, body);
  }

  @Patch('equipment/:id/status')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER)
  updateEquipment(
    @Request() request: any,
    @Param('id') id: string,
    @Body() body: AdminEquipmentStatusDto,
  ) {
    return this.service.equipmentStatus(this.actor(request).id, id, body.status);
  }

  @Get('reports')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER, UserRole.TECHNICIAN)
  reports(@Request() request: any, @Query() query: ReportsQueryDto) {
    return this.service.reports(query.status, this.actor(request));
  }

  @Patch('reports/:id/status')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER, UserRole.TECHNICIAN)
  reportStatus(
    @Request() request: any,
    @Param('id') id: string,
    @Body() body: ReportStatusDto,
  ) {
    return this.service.reportStatus(
      this.actor(request),
      id,
      body.status,
      body.diagnosis,
    );
  }

  @Patch('reports/:id/assign')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER)
  assign(
    @Request() request: any,
    @Param('id') id: string,
    @Body() body: AssignReportDto,
  ) {
    return this.service.assignReport(
      this.actor(request).id,
      id,
      body.technicianId,
    );
  }

  @Get('maintenance')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER, UserRole.TECHNICIAN)
  maintenance(@Query() query: MaintenanceQueryDto) {
    return this.service.maintenance(query.status);
  }

  @Post('maintenance')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER, UserRole.TECHNICIAN)
  createMaintenance(
    @Request() request: any,
    @Body() body: AdminCreateMaintenanceDto,
  ) {
    return this.service.createMaintenance(this.actor(request).id, body);
  }

  @Patch('maintenance/:id/status')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER, UserRole.TECHNICIAN)
  maintenanceStatus(
    @Request() request: any,
    @Param('id') id: string,
    @Body() body: AdminMaintenanceStatusDto,
  ) {
    return this.service.maintenanceStatus(
      this.actor(request).id,
      id,
      body.status,
    );
  }

  @Get('audit')
  @Roles(UserRole.ADMIN)
  audit(@Query() query: AuditQueryDto) {
    return this.service.audit(query.take ?? 100);
  }
}
