import { Body,Controller,Get,Param,Patch,Post,Query,Request,UseGuards } from '@nestjs/common';
import { BookingStatus,EquipmentStatus,MaintenanceStatus,RepairTicketStatus,UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN,UserRole.LAB_MANAGER,UserRole.TECHNICIAN)
export class AdminController {
 constructor(private readonly s:AdminService){}
 private actor(r:any){return r.user?.id??r.user?.userId??r.user?.sub}
 @Get('dashboard') dashboard(){return this.s.dashboard()}
 @Get('users') @Roles(UserRole.ADMIN) users(@Query('role') role?:UserRole,@Query('active') active?:string){return this.s.users(role,active===undefined?undefined:active==='true')}
 @Patch('users/:id') @Roles(UserRole.ADMIN) updateUser(@Request() r:any,@Param('id') id:string,@Body() b:{role?:UserRole;isActive?:boolean}){return this.s.updateUser(this.actor(r),id,b)}
 @Get('bookings') bookings(@Query('status') status?:BookingStatus){return this.s.bookings(status)}
 @Patch('bookings/:id/approve') @Roles(UserRole.ADMIN,UserRole.LAB_MANAGER) approve(@Request() r:any,@Param('id') id:string){return this.s.bookingStatus(this.actor(r),id,BookingStatus.APPROVED,'BOOKING_APPROVED')}
 @Patch('bookings/:id/reject') @Roles(UserRole.ADMIN,UserRole.LAB_MANAGER) reject(@Request() r:any,@Param('id') id:string,@Body() b:{reason?:string}){return this.s.bookingStatus(this.actor(r),id,BookingStatus.REJECTED,'BOOKING_REJECTED',{reason:b.reason??null})}
 @Patch('bookings/:id/check-out') @Roles(UserRole.ADMIN,UserRole.LAB_MANAGER) checkout(@Request() r:any,@Param('id') id:string){return this.s.bookingStatus(this.actor(r),id,BookingStatus.CHECKED_OUT,'BOOKING_CHECKED_OUT')}
 @Patch('bookings/:id/close') close(@Request() r:any,@Param('id') id:string){return this.s.bookingStatus(this.actor(r),id,BookingStatus.CLOSED,'BOOKING_CLOSED')}
 @Get('equipment') equipment(@Query('category') category?:string,@Query('status') status?:EquipmentStatus){return this.s.equipment(category,status)}
 @Post('equipment') @Roles(UserRole.ADMIN,UserRole.LAB_MANAGER) createEquipment(@Request() r:any,@Body() b:any){return this.s.createEquipment(this.actor(r),b)}
 @Patch('equipment/:id/status') updateEquipment(@Request() r:any,@Param('id') id:string,@Body() b:{status:EquipmentStatus}){return this.s.equipmentStatus(this.actor(r),id,b.status)}
 @Get('reports') reports(@Query('status') status?:RepairTicketStatus){return this.s.reports(status)}
 @Patch('reports/:id/status') reportStatus(@Request() r:any,@Param('id') id:string,@Body() b:{status:RepairTicketStatus;diagnosis?:string}){return this.s.reportStatus(this.actor(r),id,b.status,b.diagnosis)}
 @Patch('reports/:id/assign') @Roles(UserRole.ADMIN,UserRole.LAB_MANAGER) assign(@Request() r:any,@Param('id') id:string,@Body() b:{technicianId:string}){return this.s.assignReport(this.actor(r),id,b.technicianId)}
 @Get('maintenance') maintenance(@Query('status') status?:MaintenanceStatus){return this.s.maintenance(status)}
 @Post('maintenance') createMaintenance(@Request() r:any,@Body() b:any){return this.s.createMaintenance(this.actor(r),b)}
 @Patch('maintenance/:id/status') maintenanceStatus(@Request() r:any,@Param('id') id:string,@Body() b:{status:MaintenanceStatus}){return this.s.maintenanceStatus(this.actor(r),id,b.status)}
 @Get('audit') @Roles(UserRole.ADMIN) audit(@Query('take') take?:string){return this.s.audit(take?Number(take):100)}
}
