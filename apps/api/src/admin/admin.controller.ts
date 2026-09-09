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
import {
  BookingStatus,
  EquipmentStatus,
  MaintenanceStatus,
  RepairTicketStatus,
  UserRole,
} from '@prisma/client';
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
  RejectBookingDto,
  ReportStatusDto,
  UpdateUserDto,
} from './admin.dto';
import { AdminService } from './admin.service';

@ApiTags('Administration')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.LAB_MANAGER, UserRole.TECHNICIAN)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  private actor(request: any) {
    return request.user?.id ?? request.user?.userId ?? request.user?.sub;
  }

  @Get('dashboard')
  dashboard() {
    return this.service.dashboard();
  }

  @Get('users')
  @Roles(UserRole.ADMIN)
  users(@Query('role') role?: UserRole, @Query('active') active?: string) {
    return this.service.users(
      role,
      active === undefined ? undefined : active === 'true',
    );
  }

  @Patch('users/:id')
  @Roles(UserRole.ADMIN)
  updateUser(
    @Request() request: any,
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.service.updateUser(this.actor(request), id, body);
  }

  @Get('bookings')
  bookings(@Query('status') status?: BookingStatus) {
    return this.service.bookings(status);
  }

  @Patch('bookings/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER)
  approve(@Request() request: any, @Param('id') id: string) {
    return this.service.bookingStatus(
      this.actor(request),
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
      this.actor(request),
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
      this.actor(request),
      id,
      BookingStatus.CHECKED_OUT,
      'BOOKING_CHECKED_OUT',
    );
  }

  @Patch('bookings/:id/return')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER)
  returnBooking(@Request() request: any, @Param('id') id: string) {
    return this.service.bookingStatus(
      this.actor(request),
      id,
      BookingStatus.RETURNED,
      'BOOKING_RETURNED',
    );
  }

  @Patch('bookings/:id/close')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER, UserRole.TECHNICIAN)
  close(@Request() request: any, @Param('id') id: string) {
    return this.service.bookingStatus(
      this.actor(request),
      id,
      BookingStatus.CLOSED,
      'BOOKING_CLOSED',
    );
  }

  @Get('equipment')
  equipment(
    @Query('category') category?: string,
    @Query('status') status?: EquipmentStatus,
  ) {
    return this.service.equipment(category, status);
  }

  @Post('equipment')
  @Roles(UserRole.ADMIN, UserRole.LAB_MANAGER)
  createEquipment(
    @Request() request: any,
    @Body() body: AdminCreateEquipmentDto,
  ) {
    return this.service.createEquipment(this.actor(request), body);
  }

  @Patch('equipment/:id/status')
  updateEquipment(
    @Request() request: any,
    @Param('id') id: string,
    @Body() body: AdminEquipmentStatusDto,
  ) {
    return this.service.equipmentStatus(this.actor(request), id, body.status);
  }

  @Get('reports')
  reports(@Query('status') status?: RepairTicketStatus) {
    return this.service.reports(status);
  }

  @Patch('reports/:id/status')
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
      this.actor(request),
      id,
      body.technicianId,
    );
  }

  @Get('maintenance')
  maintenance(@Query('status') status?: MaintenanceStatus) {
    return this.service.maintenance(status);
  }

  @Post('maintenance')
  createMaintenance(
    @Request() request: any,
    @Body() body: AdminCreateMaintenanceDto,
  ) {
    return this.service.createMaintenance(this.actor(request), body);
  }

  @Patch('maintenance/:id/status')
  maintenanceStatus(
    @Request() request: any,
    @Param('id') id: string,
    @Body() body: AdminMaintenanceStatusDto,
  ) {
    return this.service.maintenanceStatus(
      this.actor(request),
      id,
      body.status,
    );
  }

  @Get('audit')
  @Roles(UserRole.ADMIN)
  audit(@Query('take') take?: string) {
    return this.service.audit(take ? Number(take) : 100);
  }
}
