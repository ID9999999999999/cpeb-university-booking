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
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  BookingAvailabilityQueryDto,
  CreateBookingDto,
  RateBookingDto,
} from './bookings.dto';
import { BookingsService } from './bookings.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
export class BookingsController {
  constructor(private readonly s: BookingsService) {}

  private uid(r: any) {
    return r.user?.userId ?? r.user?.id ?? r.user?.sub;
  }

  @Get('mine')
  mine(@Request() r: any) {
    return this.s.mine(this.uid(r));
  }

  @Get('availability')
  availability(@Query() query: BookingAvailabilityQueryDto) {
    return this.s.availability(query);
  }

  @Post()
  create(@Request() r: any, @Body() b: CreateBookingDto) {
    return this.s.create({
      equipmentId: b.equipmentId,
      userId: this.uid(r),
      startTime: b.startTime,
      endTime: b.endTime,
      reason: b.reason,
    });
  }

  @Patch(':id/cancel')
  cancel(@Request() r: any, @Param('id') id: string) {
    return this.s.cancel(id, this.uid(r));
  }

  @Patch(':id/finish')
  finish(@Request() r: any, @Param('id') id: string) {
    return this.s.finish(id, this.uid(r));
  }

  @Post(':id/rating')
  rate(@Request() r: any, @Param('id') id: string, @Body() body: RateBookingDto) {
    return this.s.rate(id, this.uid(r), body.score, body.comment);
  }
}
