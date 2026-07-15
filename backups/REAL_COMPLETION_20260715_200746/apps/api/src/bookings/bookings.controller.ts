import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { Roles } from '../auth/roles.decorator';

import { BookingsService } from './bookings.service';

@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll() {
    return this.bookingsService.findAll();
  }

  @Post()
  createBooking(@Body() body: any) {
    return this.bookingsService.createBooking({
      equipmentId: body.equipmentId,
      userId: body.userId,
      startTime: body.startTime,
      endTime: body.endTime,
      reason: body.reason,
    });
  }

  @Roles('ADMIN')
  @Patch(':id/approve')
  approveBooking(@Param('id') id: string, @Body() body: any) {
    return this.bookingsService.approveBooking({
      bookingId: id,
      actorId: body.actorId,
    });
  }

  @Roles('ADMIN')
  @Patch(':id/reject')
  rejectBooking(@Param('id') id: string, @Body() body: any) {
    return this.bookingsService.rejectBooking({
      bookingId: id,
      actorId: body.actorId,
      reason: body.reason,
    });
  }
}