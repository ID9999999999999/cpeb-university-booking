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