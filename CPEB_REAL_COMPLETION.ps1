param([string]$Root="C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES")
$ErrorActionPreference="Stop"
Set-StrictMode -Version Latest
function Step($m){Write-Host "`n=== $m ===" -ForegroundColor Cyan}
function W($p,$c){$d=Split-Path $p -Parent;New-Item -ItemType Directory -Force -Path $d|Out-Null;[IO.File]::WriteAllText($p,$c,[Text.UTF8Encoding]::new($false))}
$api=Join-Path $Root "apps\api";$and=Join-Path $Root "apps\android"
if(!(Test-Path $api)-or!(Test-Path $and)){throw "Project not found: $Root"}
$stamp=Get-Date -Format "yyyyMMdd_HHmmss";$backup=Join-Path $Root "backups\REAL_COMPLETION_$stamp"
Step "Full backup";New-Item -ItemType Directory -Force $backup|Out-Null;Copy-Item (Join-Path $Root "apps") (Join-Path $backup "apps") -Recurse -Force
Step "Safe Git branch";Push-Location $Root;try{git checkout -b "real-completion-$stamp"}finally{Pop-Location}
$ip=(Get-NetIPAddress -AddressFamily IPv4|?{$_.IPAddress-notlike"127.*"-and$_.IPAddress-notlike"169.254.*"-and$_.InterfaceAlias-notmatch"Loopback|vEthernet|Virtual|WSL"}|Sort InterfaceMetric|Select -First 1 -Expand IPAddress)
if(!$ip){$ip="10.0.2.2"};$base="http://$ip`:3000/";Write-Host "API URL: $base" -ForegroundColor Green

Step "Prisma schema"
W (Join-Path $api "prisma\schema.prisma") @'
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql" }

enum UserRole { STUDENT TEACHER LAB_MANAGER TECHNICIAN ADMIN }
enum EquipmentStatus { AVAILABLE RESERVED CHECKED_OUT UNDER_MAINTENANCE LOST RETIRED }
enum BookingStatus { PENDING APPROVED REJECTED CANCELLED CHECKED_OUT RETURNED CLOSED }
enum MaintenanceStatus { SCHEDULED ACTIVE COMPLETED CANCELLED }
enum RepairTicketStatus { OPEN DIAGNOSING WAITING_PARTS READY_FOR_TEST RESOLVED CLOSED }

model User {
  id String @id @default(cuid())
  fullName String
  email String @unique
  password String
  role UserRole @default(STUDENT)
  isActive Boolean @default(true)
  bookings Booking[]
  auditLogs AuditLog[] @relation("ActorAuditLogs")
  repairTickets RepairTicket[] @relation("TechnicianTickets")
  submittedReports RepairTicket[] @relation("ReporterTickets")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
model Equipment {
  id String @id @default(cuid())
  name String
  category String
  inventoryTag String @unique
  location String?
  status EquipmentStatus @default(AVAILABLE)
  description String?
  bookings Booking[]
  maintenanceRecords MaintenanceRecord[]
  repairTickets RepairTicket[]
  auditLogs AuditLog[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([category])
  @@index([status])
}
model Booking {
  id String @id @default(cuid())
  equipmentId String
  userId String
  startTime DateTime
  endTime DateTime
  status BookingStatus @default(PENDING)
  reason String?
  equipment Equipment @relation(fields:[equipmentId],references:[id])
  user User @relation(fields:[userId],references:[id])
  auditLogs AuditLog[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([equipmentId,startTime,endTime])
  @@index([userId])
  @@index([status])
}
model MaintenanceRecord {
  id String @id @default(cuid())
  equipmentId String
  title String
  description String?
  startTime DateTime
  endTime DateTime
  status MaintenanceStatus @default(SCHEDULED)
  equipment Equipment @relation(fields:[equipmentId],references:[id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([equipmentId,startTime,endTime])
  @@index([status])
}
model RepairTicket {
  id String @id @default(cuid())
  equipmentId String
  technicianId String?
  reporterId String?
  title String
  description String?
  diagnosis String?
  evidenceUrl String?
  status RepairTicketStatus @default(OPEN)
  equipment Equipment @relation(fields:[equipmentId],references:[id])
  technician User? @relation("TechnicianTickets",fields:[technicianId],references:[id])
  reporter User? @relation("ReporterTickets",fields:[reporterId],references:[id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([equipmentId])
  @@index([technicianId])
  @@index([reporterId])
  @@index([status])
}
model AuditLog {
  id String @id @default(cuid())
  actorId String?
  equipmentId String?
  bookingId String?
  action String
  entityType String
  entityId String?
  metadata Json?
  actor User? @relation("ActorAuditLogs",fields:[actorId],references:[id])
  equipment Equipment? @relation(fields:[equipmentId],references:[id])
  booking Booking? @relation(fields:[bookingId],references:[id])
  createdAt DateTime @default(now())
  @@index([actorId])
  @@index([equipmentId])
  @@index([bookingId])
  @@index([action])
}
'@

Step "Bookings backend"
W (Join-Path $api "src\bookings\bookings.controller.ts") @'
import {Body,Controller,Get,Param,Patch,Post,Query,Request,UseGuards} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {BookingsService} from './bookings.service';
@Controller('bookings') @UseGuards(AuthGuard('jwt'))
export class BookingsController{
 constructor(private readonly s:BookingsService){}
 private uid(r:any){return r.user?.userId??r.user?.id??r.user?.sub}
 @Get('mine') mine(@Request()r:any){return this.s.mine(this.uid(r))}
 @Get('availability') availability(@Query('equipmentId') equipmentId:string,@Query('startTime') startTime:string,@Query('endTime') endTime:string){return this.s.availability({equipmentId,startTime,endTime})}
 @Post() create(@Request()r:any,@Body()b:any){return this.s.create({equipmentId:b.equipmentId,userId:this.uid(r),startTime:b.startTime,endTime:b.endTime,reason:b.reason})}
 @Patch(':id/cancel') cancel(@Request()r:any,@Param('id')id:string){return this.s.cancel(id,this.uid(r))}
 @Patch(':id/finish') finish(@Request()r:any,@Param('id')id:string){return this.s.finish(id,this.uid(r))}
}
'@
W (Join-Path $api "src\bookings\bookings.service.ts") @'
import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {BookingStatus,EquipmentStatus,MaintenanceStatus} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';
type Win={equipmentId:string,startTime:string,endTime:string};type Create=Win&{userId:string,reason?:string};
@Injectable() export class BookingsService{
 constructor(private readonly p:PrismaService){}
 private dates(s:string,e:string){const a=new Date(s),b=new Date(e);if(Number.isNaN(a.getTime())||Number.isNaN(b.getTime()))throw new BadRequestException('Invalid date');if(a>=b)throw new BadRequestException('Start must be before end');if(a<new Date())throw new BadRequestException('Time must be in future');return{a,b}}
 async availability(i:Win){const{a,b}=this.dates(i.startTime,i.endTime);const eq=await this.p.equipment.findUnique({where:{id:i.equipmentId}});if(!eq)throw new NotFoundException('Resource not found');if([EquipmentStatus.UNDER_MAINTENANCE,EquipmentStatus.LOST,EquipmentStatus.RETIRED].includes(eq.status))return{available:false,reason:`Resource status is ${eq.status}`};const m=await this.p.maintenanceRecord.findFirst({where:{equipmentId:i.equipmentId,status:{in:[MaintenanceStatus.SCHEDULED,MaintenanceStatus.ACTIVE]},startTime:{lt:b},endTime:{gt:a}}});if(m)return{available:false,reason:'Maintenance conflict'};const c=await this.p.booking.findFirst({where:{equipmentId:i.equipmentId,status:{in:[BookingStatus.PENDING,BookingStatus.APPROVED,BookingStatus.CHECKED_OUT]},startTime:{lt:b},endTime:{gt:a}}});return c?{available:false,reason:'Already booked'}:{available:true,reason:'Available'}}
 async create(i:Create){const av=await this.availability(i);if(!av.available)throw new ConflictException(av.reason);const{a,b}=this.dates(i.startTime,i.endTime);return this.p.booking.create({data:{equipmentId:i.equipmentId,userId:i.userId,startTime:a,endTime:b,reason:i.reason,status:BookingStatus.APPROVED},include:{equipment:true}})}
 mine(userId:string){return this.p.booking.findMany({where:{userId},include:{equipment:true},orderBy:{createdAt:'desc'}})}
 async cancel(id:string,userId:string){const x=await this.p.booking.findFirst({where:{id,userId}});if(!x)throw new NotFoundException('Booking not found');if(![BookingStatus.PENDING,BookingStatus.APPROVED].includes(x.status))throw new BadRequestException('Cannot cancel');return this.p.booking.update({where:{id},data:{status:BookingStatus.CANCELLED},include:{equipment:true}})}
 async finish(id:string,userId:string){const x=await this.p.booking.findFirst({where:{id,userId}});if(!x)throw new NotFoundException('Booking not found');if([BookingStatus.CANCELLED,BookingStatus.REJECTED,BookingStatus.CLOSED].includes(x.status))throw new BadRequestException('Cannot finish');return this.p.booking.update({where:{id},data:{status:BookingStatus.CLOSED},include:{equipment:true}})}
}
'@

Step "Reports backend"
W (Join-Path $api "src\repair-tickets\repair-tickets.controller.ts") @'
import {Body,Controller,Get,Post,Request,UseGuards} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {RepairTicketsService} from './repair-tickets.service';
@Controller('repair-tickets') @UseGuards(AuthGuard('jwt'))
export class RepairTicketsController{
 constructor(private readonly s:RepairTicketsService){}
 private uid(r:any){return r.user?.userId??r.user?.id??r.user?.sub}
 @Get('mine') mine(@Request()r:any){return this.s.mine(this.uid(r))}
 @Post() create(@Request()r:any,@Body()b:any){return this.s.create({equipmentId:b.equipmentId,reporterId:this.uid(r),title:b.title,description:b.description})}
}
'@
W (Join-Path $api "src\repair-tickets\repair-tickets.service.ts") @'
import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
@Injectable() export class RepairTicketsService{
 constructor(private readonly p:PrismaService){}
 mine(reporterId:string){return this.p.repairTicket.findMany({where:{reporterId},include:{equipment:true},orderBy:{createdAt:'desc'}})}
 async create(i:{equipmentId:string,reporterId:string,title:string,description?:string}){if(!i.title?.trim())throw new BadRequestException('Title required');const e=await this.p.equipment.findUnique({where:{id:i.equipmentId}});if(!e)throw new NotFoundException('Resource not found');return this.p.repairTicket.create({data:{equipmentId:i.equipmentId,reporterId:i.reporterId,title:i.title.trim(),description:i.description?.trim()},include:{equipment:true}})}
}
'@

Step "Resource seed"
W (Join-Path $api "prisma\seed.cjs") @'
require("dotenv/config");const{Pool}=require("pg");
const r=[
["ROOM","Lecture Hall A1","ROOM-A1","Building A","120 seats and projector"],["ROOM","Lecture Hall A2","ROOM-A2","Building A","80 seats"],["ROOM","Seminar Room B1","ROOM-B1","Building B","Seminar room"],["ROOM","Seminar Room B2","ROOM-B2","Building B","Small seminar room"],["ROOM","Conference Room C3","ROOM-C3","Administration","Hybrid conference room"],["ROOM","Study Room L201","ROOM-L201","Library","Quiet study room"],["ROOM","Study Room L202","ROOM-L202","Library","Quiet study room"],["ROOM","University Auditorium","ROOM-AUD","Main Building","Large auditorium"],
["LAB","Computer Laboratory","LAB-COMP","Technology Building","Networked computers"],["LAB","Artificial Intelligence Laboratory","LAB-AI","Technology Building","GPU workstations"],["LAB","Physics Laboratory","LAB-PHY","Science Block","Physics lab"],["LAB","Electronics Laboratory","LAB-ELC","Engineering Block","Electronics tools"],
["MEDIA","DSLR Camera Canon 01","MEDIA-CAM-01","Media Office","DSLR camera"],["MEDIA","Video Camera Sony 01","MEDIA-VID-01","Media Office","Video camera"],["MEDIA","Portable Projector 01","MEDIA-PROJ-01","Media Office","Full HD projector"],["MEDIA","Wireless Microphone Kit","MEDIA-MIC-01","Media Office","Wireless microphones"],["MEDIA","Podcast Audio Kit","MEDIA-POD-01","Media Studio","Recorder and microphones"],["MEDIA","Studio Lighting Kit","MEDIA-LIGHT-01","Media Studio","LED lighting"],["MEDIA","Tripod Heavy Duty","MEDIA-TRI-01","Media Office","Professional tripod"],["MEDIA","Portable Projection Screen","MEDIA-SCREEN-01","Media Office","Foldable screen"],
["SPORT","Football Kit","SPORT-FOOT-01","Sports Center","Balls cones and bibs"],["SPORT","Basketball Kit","SPORT-BASK-01","Sports Center","Basketballs and bibs"],["SPORT","Volleyball Kit","SPORT-VOLL-01","Sports Center","Ball net and markers"],["SPORT","Tennis Racket Set","SPORT-TENN-01","Sports Center","Rackets and balls"],["SPORT","Table Tennis Kit","SPORT-TT-01","Sports Center","Paddles balls and net"],["SPORT","Training Cones Set","SPORT-CONE-01","Sports Storage","Training cones"],["SPORT","Indoor Court Slot","SPORT-COURT-IN","Sports Hall","Indoor court"],["SPORT","Outdoor Field Slot","SPORT-FIELD-OUT","Sports Center","Outdoor field"],
...Array.from({length:30},(_,i)=>["PARKING",`Parking Slot P-${String(i+1).padStart(3,"0")}`,`PARK-${String(i+1).padStart(3,"0")}`,"University Main Parking","Numbered parking space"])
];
(async()=>{const p=new Pool({connectionString:process.env.DATABASE_URL});for(const[c,n,t,l,d]of r)await p.query(`INSERT INTO "Equipment"("id","name","category","inventoryTag","location","status","description","createdAt","updatedAt") VALUES(concat('seed_',md5($3)),$2,$1,$3,$4,'AVAILABLE',$5,now(),now()) ON CONFLICT("inventoryTag") DO UPDATE SET "name"=EXCLUDED."name","category"=EXCLUDED."category","location"=EXCLUDED."location","description"=EXCLUDED."description","updatedAt"=now()`,[c,n,t,l,d]);await p.end();console.log(`Seeded ${r.length} resources`)})().catch(e=>{console.error(e);process.exit(1)})
'@

Step "Android API"
W (Join-Path $and "app\src\main\java\com\yasser\ub\real\RealApi.kt") @"
package com.yasser.ub.real
import android.content.Context
import com.google.gson.annotations.SerializedName
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
data class UserDto(val id:String,val fullName:String,val email:String,val role:String)
data class AuthResponse(@SerializedName("accessToken")val accessToken:String,val user:UserDto)
data class LoginBody(val email:String,val password:String)
data class RegisterBody(val fullName:String,val email:String,val password:String)
data class EquipmentDto(val id:String,val name:String,val category:String,val inventoryTag:String,val location:String?,val status:String,val description:String?)
data class BookingBody(val equipmentId:String,val startTime:String,val endTime:String,val reason:String?)
data class BookingDto(val id:String,val startTime:String,val endTime:String,val status:String,val reason:String?,val equipment:EquipmentDto)
data class AvailabilityDto(val available:Boolean,val reason:String)
data class ReportBody(val equipmentId:String,val title:String,val description:String?)
data class ReportDto(val id:String,val title:String,val description:String?,val status:String,val createdAt:String,val equipment:EquipmentDto)
interface RealApi{
 @POST("auth/login") suspend fun login(@Body b:LoginBody):AuthResponse
 @POST("auth/register") suspend fun register(@Body b:RegisterBody):AuthResponse
 @GET("equipment") suspend fun equipment(@Header("Authorization")a:String):List<EquipmentDto>
 @GET("bookings/mine") suspend fun bookings(@Header("Authorization")a:String):List<BookingDto>
 @GET("bookings/availability") suspend fun availability(@Header("Authorization")a:String,@Query("equipmentId")id:String,@Query("startTime")s:String,@Query("endTime")e:String):AvailabilityDto
 @POST("bookings") suspend fun book(@Header("Authorization")a:String,@Body b:BookingBody):BookingDto
 @PATCH("bookings/{id}/cancel") suspend fun cancel(@Header("Authorization")a:String,@Path("id")id:String):BookingDto
 @PATCH("bookings/{id}/finish") suspend fun finish(@Header("Authorization")a:String,@Path("id")id:String):BookingDto
 @GET("repair-tickets/mine") suspend fun reports(@Header("Authorization")a:String):List<ReportDto>
 @POST("repair-tickets") suspend fun report(@Header("Authorization")a:String,@Body b:ReportBody):ReportDto
}
class Session(c:Context){private val p=c.getSharedPreferences("cpeb_session",0);var token:String? get()=p.getString("token",null);set(v){p.edit().putString("token",v).apply()};var name:String? get()=p.getString("name",null);set(v){p.edit().putString("name",v).apply()};fun clear()=p.edit().clear().apply();fun bearer()="Bearer `${token?:""}"}
object ApiFactory{const val BASE_URL="$base";val api:RealApi by lazy{Retrofit.Builder().baseUrl(BASE_URL).addConverterFactory(GsonConverterFactory.create()).build().create(RealApi::class.java)}}
"@

Step "Android functional app"
W (Join-Path $and "app\src\main\java\com\yasser\ub\real\CpebRealApp.kt") @'
package com.yasser.ub.real
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Calendar
private val Blue=Color(0xFF0B5CFF)
private enum class S{LOGIN,REGISTER,HOME,RESOURCES,BOOK,BOOKINGS,REPORTS,PROFILE}
@Composable fun CpebRealApp(){
 val ctx=LocalContext.current;val ses=remember{Session(ctx)};val co=rememberCoroutineScope()
 var s by remember{mutableStateOf(if(ses.token==null)S.LOGIN else S.HOME)};var err by remember{mutableStateOf("")};var busy by remember{mutableStateOf(false)}
 var rs by remember{mutableStateOf<List<EquipmentDto>>(emptyList())};var bs by remember{mutableStateOf<List<BookingDto>>(emptyList())};var ps by remember{mutableStateOf<List<ReportDto>>(emptyList())};var sel by remember{mutableStateOf<EquipmentDto?>(null)}
 fun msg(t:Throwable)=if(t is HttpException)t.response()?.errorBody()?.string()?:"Request failed" else t.message?:"Cannot connect";fun a()=ses.bearer()
 fun load(){co.launch{busy=true;err="";try{rs=ApiFactory.api.equipment(a());bs=ApiFactory.api.bookings(a());ps=ApiFactory.api.reports(a())}catch(t:Throwable){err=msg(t)};busy=false}}
 LaunchedEffect(ses.token){if(ses.token!=null)load()}
 MaterialTheme(colorScheme=lightColorScheme(primary=Blue)){Scaffold(bottomBar={if(s!=S.LOGIN&&s!=S.REGISTER)NavigationBar{listOf(S.HOME to"Home",S.RESOURCES to"Resources",S.BOOKINGS to"Bookings",S.REPORTS to"Reports",S.PROFILE to"Profile").forEach{(x,n)->NavigationBarItem(s==x,{s=x},{Text(n.take(1))},{Text(n)})}}}){p->Box(Modifier.padding(p).fillMaxSize()){when(s){
 S.LOGIN->Login(busy,err,{e,pw->co.launch{busy=true;err="";try{val r=ApiFactory.api.login(LoginBody(e,pw));ses.token=r.accessToken;ses.name=r.user.fullName;s=S.HOME}catch(t:Throwable){err=msg(t)};busy=false}},{s=S.REGISTER})
 S.REGISTER->Register(busy,err,{s=S.LOGIN},{n,e,pw->co.launch{busy=true;err="";try{val r=ApiFactory.api.register(RegisterBody(n,e,pw));ses.token=r.accessToken;ses.name=r.user.fullName;s=S.HOME}catch(t:Throwable){err=msg(t)};busy=false}})
 S.HOME->Frame("Hello, ${ses.name?:"Student"}"){Text("Real database");Text("Resources ${rs.size} • Bookings ${bs.size} • Reports ${ps.size}");Button({s=S.RESOURCES},Modifier.fillMaxWidth()){Text("Browse resources")};OutlinedButton({load()},Modifier.fillMaxWidth()){Text(if(busy)"Loading..." else"Refresh")};if(err.isNotBlank())Text(err,color=Color.Red)}
 S.RESOURCES->Resources(rs){sel=it;s=S.BOOK}
 S.BOOK->sel?.let{x->Book(x,err,busy,{s=S.RESOURCES}){st,en,re->co.launch{busy=true;err="";try{val v=ApiFactory.api.availability(a(),x.id,st,en);if(!v.available)err=v.reason else{ApiFactory.api.book(a(),BookingBody(x.id,st,en,re));bs=ApiFactory.api.bookings(a());s=S.BOOKINGS}}catch(t:Throwable){err=msg(t)};busy=false}}}
 S.BOOKINGS->Bookings(bs,err,{load()},{id->co.launch{try{ApiFactory.api.cancel(a(),id);bs=ApiFactory.api.bookings(a())}catch(t:Throwable){err=msg(t)}}},{id->co.launch{try{ApiFactory.api.finish(a(),id);bs=ApiFactory.api.bookings(a())}catch(t:Throwable){err=msg(t)}}})
 S.REPORTS->Reports(ps,rs,err,{load()}){id,t,d->co.launch{try{ApiFactory.api.report(a(),ReportBody(id,t,d));ps=ApiFactory.api.reports(a())}catch(x:Throwable){err=msg(x)}}}
 S.PROFILE->Frame("Profile"){Text(ses.name?:"Student",fontWeight=FontWeight.Bold);Text(ApiFactory.BASE_URL);Button({ses.clear();rs=emptyList();bs=emptyList();ps=emptyList();s=S.LOGIN},colors=ButtonDefaults.buttonColors(containerColor=Color.Red),modifier=Modifier.fillMaxWidth()){Text("Log out")}}
 }}}}
}
@Composable private fun Frame(t:String,c:@Composable ColumnScope.()->Unit){LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(14.dp)){item{Text(t,style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)};item{Column(verticalArrangement=Arrangement.spacedBy(12.dp),content=c)}}}
@Composable private fun Login(b:Boolean,e:String,go:(String,String)->Unit,reg:()->Unit){var u by remember{mutableStateOf("")};var p by remember{mutableStateOf("")};Frame("University Sign In"){OutlinedTextField(u,{u=it},label={Text("University email")},modifier=Modifier.fillMaxWidth());OutlinedTextField(p,{p=it},label={Text("Password")},visualTransformation=PasswordVisualTransformation(),modifier=Modifier.fillMaxWidth());if(e.isNotBlank())Text(e,color=Color.Red);Button({go(u,p)},enabled=!b&&u.contains("@")&&p.isNotBlank(),modifier=Modifier.fillMaxWidth()){Text(if(b)"Signing in..." else"Sign in")};TextButton(reg,Modifier.align(Alignment.CenterHorizontally)){Text("Create student account")};Text("Fake verification removed: registration is real and immediate.")}}
@Composable private fun Register(b:Boolean,e:String,back:()->Unit,go:(String,String,String)->Unit){var n by remember{mutableStateOf("")};var u by remember{mutableStateOf("")};var p by remember{mutableStateOf("")};Frame("Create Account"){OutlinedTextField(n,{n=it},label={Text("Full name")},modifier=Modifier.fillMaxWidth());OutlinedTextField(u,{u=it},label={Text("Email")},modifier=Modifier.fillMaxWidth());OutlinedTextField(p,{p=it},label={Text("Password")},visualTransformation=PasswordVisualTransformation(),modifier=Modifier.fillMaxWidth());if(e.isNotBlank())Text(e,color=Color.Red);Button({go(n,u,p)},enabled=!b&&n.isNotBlank()&&u.contains("@")&&p.length>=6,modifier=Modifier.fillMaxWidth()){Text("Create account")};TextButton(back){Text("Back")}}}
@Composable private fun Resources(r:List<EquipmentDto>,pick:(EquipmentDto)->Unit){var c by remember{mutableStateOf("ALL")};val cs=listOf("ALL")+r.map{it.category}.distinct();LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){item{Text("Resources",style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)};item{Column{cs.forEach{x->FilterChip(c==x,{c=x},{Text(x)})}}};items(r.filter{c=="ALL"||it.category==c}){x->Card(Modifier.fillMaxWidth().clickable{pick(x)},shape=RoundedCornerShape(18.dp)){Column(Modifier.padding(16.dp)){Text(x.name,fontWeight=FontWeight.Black);Text("${x.category} • ${x.inventoryTag}");Text(x.location?:"Campus");Text(x.status);x.description?.let{Text(it)}}}}}}
@Composable private fun Book(x:EquipmentDto,e:String,b:Boolean,back:()->Unit,go:(String,String,String)->Unit){val ctx=LocalContext.current;var d by remember{mutableStateOf("")};var st by remember{mutableStateOf("")};var en by remember{mutableStateOf("")};var r by remember{mutableStateOf("")};fun pd(){val c=Calendar.getInstance();DatePickerDialog(ctx,{_,y,m,z->d="%04d-%02d-%02d".format(y,m+1,z)},c[1],c[2],c[5]).show()};fun pt(set:(String)->Unit){val c=Calendar.getInstance();TimePickerDialog(ctx,{_,h,m->set("%02d:%02d".format(h,m))},c[11],c[12],true).show()};Frame("Book ${x.name}"){Text("Any day, including Saturday and Sunday.");OutlinedButton({pd()},Modifier.fillMaxWidth()){Text(if(d=="")"Choose date" else d)};Row{OutlinedButton({pt{st=it}},Modifier.weight(1f)){Text(if(st=="")"Start" else st)};OutlinedButton({pt{en=it}},Modifier.weight(1f)){Text(if(en=="")"End" else en)}};OutlinedTextField(r,{r=it},label={Text("Purpose")},modifier=Modifier.fillMaxWidth());if(e.isNotBlank())Text(e,color=Color.Red);Button({val f=DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");go(LocalDateTime.parse("$d $st",f).atZone(ZoneId.systemDefault()).toInstant().toString(),LocalDateTime.parse("$d $en",f).atZone(ZoneId.systemDefault()).toInstant().toString(),r)},enabled=!b&&d!=""&&st!=""&&en!="",modifier=Modifier.fillMaxWidth()){Text("Check and book")};TextButton(back){Text("Back")}}}
@Composable private fun Bookings(v:List<BookingDto>,e:String,ref:()->Unit,cancel:(String)->Unit,finish:(String)->Unit){LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){item{Text("My Bookings",style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)};item{OutlinedButton(ref){Text("Refresh")};if(e.isNotBlank())Text(e,color=Color.Red)};items(v){x->Card(Modifier.fillMaxWidth()){Column(Modifier.padding(14.dp)){Text(x.equipment.name,fontWeight=FontWeight.Black);Text("${x.startTime} → ${x.endTime}");Text(x.status);Row{if(x.status=="APPROVED"||x.status=="PENDING")OutlinedButton({cancel(x.id)}){Text("Cancel")};if(x.status!="CLOSED"&&x.status!="CANCELLED"&&x.status!="REJECTED")Button({finish(x.id)}){Text("Finish")}}}}}}}
@Composable private fun Reports(v:List<ReportDto>,r:List<EquipmentDto>,e:String,ref:()->Unit,go:(String,String,String)->Unit){var q by remember{mutableStateOf(r.firstOrNull())};var t by remember{mutableStateOf("")};var d by remember{mutableStateOf("")};LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){item{Text("My Reports",style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)};item{Column{Text("Resource: ${q?.name?:"None"}");r.take(6).forEach{x->AssistChip({q=x},{Text(x.name.take(18))})};OutlinedTextField(t,{t=it},label={Text("Title")},modifier=Modifier.fillMaxWidth());OutlinedTextField(d,{d=it},label={Text("Description")},modifier=Modifier.fillMaxWidth());Button({q?.let{go(it.id,t,d);t="";d=""}},enabled=q!=null&&t!="",modifier=Modifier.fillMaxWidth()){Text("Send to database")};OutlinedButton(ref){Text("Refresh")};if(e.isNotBlank())Text(e,color=Color.Red)}};items(v){x->Card(Modifier.fillMaxWidth()){Column(Modifier.padding(14.dp)){Text(x.title,fontWeight=FontWeight.Black);Text(x.equipment.name);Text(x.status);x.description?.let{Text(it)}}}}}}
'@

Step "Switch MainActivity; old premium UI remains untouched"
W (Join-Path $and "app\src\main\java\com\yasser\ub\MainActivity.kt") @'
package com.yasser.ub
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.yasser.ub.real.CpebRealApp
class MainActivity:ComponentActivity(){override fun onCreate(b:Bundle?){super.onCreate(b);setContent{CpebRealApp()}}}
'@

Step "Manifest and dependencies"
$mp=Join-Path $and "app\src\main\AndroidManifest.xml";$m=Get-Content $mp -Raw
if($m-notmatch"android.permission.INTERNET"){$m=$m-replace'(<manifest[^>]*>)',"`$1`r`n    <uses-permission android:name=`"android.permission.INTERNET`" />"}
if($m-notmatch"usesCleartextTraffic"){$m=$m-replace'<application','<application android:usesCleartextTraffic="true"'}
W $mp $m
$gp=Join-Path $and "app\build.gradle.kts";$g=Get-Content $gp -Raw
@('implementation("com.squareup.retrofit2:retrofit:2.11.0")','implementation("com.squareup.retrofit2:converter-gson:2.11.0")','implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")')|%{if($g-notmatch[regex]::Escape($_)){$g=$g-replace'dependencies \{',"dependencies {`r`n    $_"}}
W $gp $g

Step "Database, backend build, Android build"
Push-Location $api;try{npx.cmd prisma db push;npx.cmd prisma generate;node.exe prisma\seed.cjs;npm.cmd run build}finally{Pop-Location}
$sdk=Join-Path $env:LOCALAPPDATA "Android\Sdk";[IO.File]::WriteAllText((Join-Path $and "local.properties"),"sdk.dir="+$sdk.Replace("\","\\"),[Text.Encoding]::ASCII)
Push-Location $and;try{.\gradlew.bat assembleDebug}finally{Pop-Location}
Push-Location $Root;try{git add .;git commit -m "Complete real student booking flow"}finally{Pop-Location}
Write-Host "`nSUCCESS" -ForegroundColor Green
Write-Host "Old UI preserved: apps\android\app\src\main\java\com\yasser\ub\ubpremium\UbCampusBookingApp.kt"
Write-Host "Backup: $backup"
Write-Host "APK: $(Join-Path $and 'app\build\outputs\apk\debug\app-debug.apk')"
Write-Host "API URL: $base"
