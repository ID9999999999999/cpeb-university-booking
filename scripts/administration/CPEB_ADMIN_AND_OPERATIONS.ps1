param(
  [string]$Root = "C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES",
  [string]$AdminEmail = "admin@university.test",
  [string]$AdminPassword = "Admin2026!"
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
function Step([string]$m){Write-Host "`n=== $m ===" -ForegroundColor Cyan}
function Need([string]$p){if(!(Test-Path -LiteralPath $p)){throw "Missing: $p"}}
function WriteUtf8([string]$p,[string]$c){New-Item -ItemType Directory -Force -Path (Split-Path $p -Parent)|Out-Null;[IO.File]::WriteAllText($p,$c,[Text.UTF8Encoding]::new($false))}
$api=Join-Path $Root "apps\api";$android=Join-Path $Root "apps\android";$appModule=Join-Path $api "src\app.module.ts"
Need $api;Need $android;Need $appModule;Need (Join-Path $api "prisma\schema.prisma")
$stamp=Get-Date -Format "yyyyMMdd_HHmmss";$backup=Join-Path $Root "backups\ADMIN_OPERATIONS_$stamp";New-Item -ItemType Directory -Force -Path $backup|Out-Null
Step "Creating focused safety backup";Copy-Item $appModule (Join-Path $backup "app.module.ts")
Step "Creating Git branch";Push-Location $Root;try{git checkout -b "admin-operations-$stamp";if($LASTEXITCODE-ne 0){throw "Could not create Git branch"}}finally{Pop-Location}
Step "Writing protected administration module"
WriteUtf8 (Join-Path $api "src\admin\admin.module.ts") @'
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
@Module({ imports:[PrismaModule], controllers:[AdminController], providers:[AdminService] })
export class AdminModule {}
'@
WriteUtf8 (Join-Path $api "src\admin\admin.controller.ts") @'
import { Body,Controller,Get,Param,Patch,Post,Query,Request,UseGuards } from '@nestjs/common';
import { BookingStatus,EquipmentStatus,MaintenanceStatus,RepairTicketStatus,UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
@Controller('admin')
@UseGuards(JwtAuthGuard)
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
'@
WriteUtf8 (Join-Path $api "src\admin\admin.service.ts") @'
import { BadRequestException,ConflictException,Injectable,NotFoundException } from '@nestjs/common';
import { BookingStatus,EquipmentStatus,MaintenanceStatus,RepairTicketStatus,UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class AdminService {
 constructor(private readonly p:PrismaService){}
 async dashboard(){const [u,ua,e,ea,bp,ba,r,m]=await this.p.$transaction([this.p.user.count(),this.p.user.count({where:{isActive:true}}),this.p.equipment.count(),this.p.equipment.count({where:{status:EquipmentStatus.AVAILABLE}}),this.p.booking.count({where:{status:BookingStatus.PENDING}}),this.p.booking.count({where:{status:{in:[BookingStatus.APPROVED,BookingStatus.CHECKED_OUT]}}}),this.p.repairTicket.count({where:{status:{in:[RepairTicketStatus.OPEN,RepairTicketStatus.DIAGNOSING,RepairTicketStatus.WAITING_PARTS,RepairTicketStatus.READY_FOR_TEST]}}}),this.p.maintenanceRecord.count({where:{status:{in:[MaintenanceStatus.SCHEDULED,MaintenanceStatus.ACTIVE]}}})]);return{generatedAt:new Date().toISOString(),users:{total:u,active:ua},equipment:{total:e,available:ea},bookings:{pending:bp,active:ba},reports:{open:r},maintenance:{active:m}}}
 users(role?:UserRole,active?:boolean){return this.p.user.findMany({where:{role,isActive:active},select:{id:true,fullName:true,email:true,role:true,isActive:true,createdAt:true,updatedAt:true},orderBy:[{role:'asc'},{fullName:'asc'}]})}
 async updateUser(actorId:string,userId:string,b:{role?:UserRole;isActive?:boolean}){const old=await this.p.user.findUnique({where:{id:userId}});if(!old)throw new NotFoundException('User not found');if(actorId===userId&&b.isActive===false)throw new BadRequestException('Cannot deactivate own account');const x=await this.p.user.update({where:{id:userId},data:b,select:{id:true,fullName:true,email:true,role:true,isActive:true,updatedAt:true}});await this.log(actorId,'USER_UPDATED','USER',userId,undefined,undefined,{previousRole:old.role,newRole:x.role,previousActive:old.isActive,newActive:x.isActive});return x}
 bookings(status?:BookingStatus){return this.p.booking.findMany({where:{status},include:{equipment:true,user:{select:{id:true,fullName:true,email:true,role:true}}},orderBy:[{startTime:'asc'},{createdAt:'desc'}]})}
 async bookingStatus(actorId:string,id:string,status:BookingStatus,action:string,metadata?:Record<string,unknown>){const old=await this.p.booking.findUnique({where:{id}});if(!old)throw new NotFoundException('Booking not found');if(old.status===BookingStatus.CANCELLED||old.status===BookingStatus.REJECTED||old.status===BookingStatus.CLOSED)throw new BadRequestException(`Booking already ${old.status}`);const x=await this.p.booking.update({where:{id},data:{status},include:{equipment:true,user:{select:{id:true,fullName:true,email:true}}}});await this.log(actorId,action,'BOOKING',id,old.equipmentId,id,{previousStatus:old.status,newStatus:x.status,...(metadata??{})});return x}
 equipment(category?:string,status?:EquipmentStatus){return this.p.equipment.findMany({where:{category:category?{equals:category,mode:'insensitive'}:undefined,status},orderBy:[{category:'asc'},{name:'asc'},{inventoryTag:'asc'}]})}
 async createEquipment(actorId:string,b:any){if(!b.name?.trim()||!b.category?.trim()||!b.inventoryTag?.trim())throw new BadRequestException('Name, category and inventory tag required');if(await this.p.equipment.findUnique({where:{inventoryTag:b.inventoryTag.trim().toUpperCase()}}))throw new ConflictException('Inventory tag already used');const x=await this.p.equipment.create({data:{name:b.name.trim(),category:b.category.trim().toUpperCase(),inventoryTag:b.inventoryTag.trim().toUpperCase(),location:b.location?.trim(),description:b.description?.trim(),status:EquipmentStatus.AVAILABLE}});await this.log(actorId,'EQUIPMENT_CREATED','EQUIPMENT',x.id,x.id);return x}
 async equipmentStatus(actorId:string,id:string,status:EquipmentStatus){const old=await this.p.equipment.findUnique({where:{id}});if(!old)throw new NotFoundException('Equipment not found');const x=await this.p.equipment.update({where:{id},data:{status}});await this.log(actorId,'EQUIPMENT_STATUS_UPDATED','EQUIPMENT',id,id,undefined,{previousStatus:old.status,newStatus:x.status});return x}
 reports(status?:RepairTicketStatus){return this.p.repairTicket.findMany({where:{status},include:{equipment:true,technician:{select:{id:true,fullName:true,email:true}},reporter:{select:{id:true,fullName:true,email:true}}},orderBy:{createdAt:'desc'}})}
 async reportStatus(actorId:string,id:string,status:RepairTicketStatus,diagnosis?:string){const old=await this.p.repairTicket.findUnique({where:{id}});if(!old)throw new NotFoundException('Report not found');const x=await this.p.repairTicket.update({where:{id},data:{status,diagnosis:diagnosis===undefined?undefined:diagnosis.trim()},include:{equipment:true,technician:true,reporter:true}});await this.log(actorId,'REPORT_STATUS_UPDATED','REPAIR_TICKET',id,old.equipmentId,undefined,{previousStatus:old.status,newStatus:x.status});return x}
 async assignReport(actorId:string,id:string,technicianId:string){const [r,t]=await Promise.all([this.p.repairTicket.findUnique({where:{id}}),this.p.user.findUnique({where:{id:technicianId}})]);if(!r)throw new NotFoundException('Report not found');if(!t||t.role!==UserRole.TECHNICIAN||!t.isActive)throw new BadRequestException('Active technician required');const x=await this.p.repairTicket.update({where:{id},data:{technicianId,status:r.status===RepairTicketStatus.OPEN?RepairTicketStatus.DIAGNOSING:r.status},include:{equipment:true,technician:true,reporter:true}});await this.log(actorId,'REPORT_ASSIGNED','REPAIR_TICKET',id,r.equipmentId,undefined,{technicianId});return x}
 maintenance(status?:MaintenanceStatus){return this.p.maintenanceRecord.findMany({where:{status},include:{equipment:true},orderBy:[{startTime:'asc'},{createdAt:'desc'}]})}
 async createMaintenance(actorId:string,b:any){const a=new Date(b.startTime),z=new Date(b.endTime);if(Number.isNaN(a.getTime())||Number.isNaN(z.getTime())||a>=z)throw new BadRequestException('Valid times required');if(!await this.p.equipment.findUnique({where:{id:b.equipmentId}}))throw new NotFoundException('Equipment not found');const c=await this.p.booking.findFirst({where:{equipmentId:b.equipmentId,status:{in:[BookingStatus.PENDING,BookingStatus.APPROVED,BookingStatus.CHECKED_OUT]},startTime:{lt:z},endTime:{gt:a}}});if(c)throw new ConflictException('Maintenance conflicts with booking');const x=await this.p.maintenanceRecord.create({data:{equipmentId:b.equipmentId,title:b.title.trim(),description:b.description?.trim(),startTime:a,endTime:z,status:MaintenanceStatus.SCHEDULED},include:{equipment:true}});await this.log(actorId,'MAINTENANCE_CREATED','MAINTENANCE',x.id,b.equipmentId);return x}
 async maintenanceStatus(actorId:string,id:string,status:MaintenanceStatus){const old=await this.p.maintenanceRecord.findUnique({where:{id}});if(!old)throw new NotFoundException('Maintenance not found');const x=await this.p.maintenanceRecord.update({where:{id},data:{status},include:{equipment:true}});if(status===MaintenanceStatus.ACTIVE)await this.p.equipment.update({where:{id:old.equipmentId},data:{status:EquipmentStatus.UNDER_MAINTENANCE}});if(status===MaintenanceStatus.COMPLETED||status===MaintenanceStatus.CANCELLED)await this.p.equipment.update({where:{id:old.equipmentId},data:{status:EquipmentStatus.AVAILABLE}});await this.log(actorId,'MAINTENANCE_STATUS_UPDATED','MAINTENANCE',id,old.equipmentId,undefined,{previousStatus:old.status,newStatus:x.status});return x}
 audit(take:number){const n=Number.isFinite(take)?Math.min(Math.max(Math.trunc(take),1),500):100;return this.p.auditLog.findMany({take:n,include:{actor:{select:{id:true,fullName:true,email:true,role:true}},equipment:true,booking:true},orderBy:{createdAt:'desc'}})}
 private log(actorId:string|undefined,action:string,entityType:string,entityId?:string,equipmentId?:string,bookingId?:string,metadata?:Record<string,unknown>){return this.p.auditLog.create({data:{actorId,action,entityType,entityId,equipmentId,bookingId,metadata}})}
}
'@
Step "Registering AdminModule safely"
$t=Get-Content $appModule -Raw
if($t-notmatch "from './admin/admin.module'"){$t=$t-replace "(import \{ AuthModule \} from './auth/auth.module';)","`$1`r`nimport { AdminModule } from './admin/admin.module';"}
if($t-notmatch "(?s)imports:\s*\[[^\]]*AdminModule"){$t=$t-replace "(AuthModule,\s*\r?\n\s*\])","AuthModule,`r`n    AdminModule,`r`n  ]"}
WriteUtf8 $appModule $t
Step "Creating idempotent admin accounts"
WriteUtf8 (Join-Path $api "prisma\seed-admin.cjs") @'
require('dotenv/config');const{Pool}=require('pg');const bcrypt=require('bcrypt');
const adminEmail=process.env.CPEB_ADMIN_EMAIL||'admin@university.test';const adminPassword=process.env.CPEB_ADMIN_PASSWORD||'Admin2026!';
async function up(pool,name,email,password,role){const hash=await bcrypt.hash(password,12);await pool.query(`INSERT INTO "User" ("id","fullName","email","password","role","isActive","createdAt","updatedAt") VALUES (concat('seed_',md5($2)),$1,lower($2),$3,$4,true,now(),now()) ON CONFLICT ("email") DO UPDATE SET "fullName"=EXCLUDED."fullName","password"=EXCLUDED."password","role"=EXCLUDED."role","isActive"=true,"updatedAt"=now()`,[name,email,hash,role])}
(async()=>{const p=new Pool({connectionString:process.env.DATABASE_URL});await up(p,'CPEB Administrator',adminEmail,adminPassword,'ADMIN');await up(p,'CPEB Technician','technician@university.test','Tech2026!','TECHNICIAN');await p.end();console.log('Administrative accounts ready')})().catch(e=>{console.error(e);process.exit(1)})
'@
Step "Generating Prisma and seeding accounts";Push-Location $api;try{npx.cmd prisma generate --schema ".\prisma\schema.prisma";if($LASTEXITCODE-ne 0){throw "Prisma generate failed"};$env:CPEB_ADMIN_EMAIL=$AdminEmail;$env:CPEB_ADMIN_PASSWORD=$AdminPassword;node.exe ".\prisma\seed-admin.cjs";if($LASTEXITCODE-ne 0){throw "Admin seed failed"};npm.cmd run build;if($LASTEXITCODE-ne 0){throw "Backend build failed"}}finally{Pop-Location}
Step "Building Android unchanged";Push-Location $android;try{.\gradlew.bat assembleDebug;if($LASTEXITCODE-ne 0){throw "Android build failed"}}finally{Pop-Location}
Step "Committing successful package";Push-Location $Root;try{git add "apps/api/src/admin" "apps/api/src/app.module.ts" "apps/api/prisma/seed-admin.cjs";git commit -m "Add protected administration and operations API";if($LASTEXITCODE-ne 0){throw "Git commit failed"}}finally{Pop-Location}
$apk=Join-Path $android "app\build\outputs\apk\debug\app-debug.apk"
Write-Host "`nSUCCESS" -ForegroundColor Green;Write-Host "Backup: $backup";Write-Host "APK: $apk";Write-Host "ADMIN: $AdminEmail / $AdminPassword";Write-Host "TECHNICIAN: technician@university.test / Tech2026!"
