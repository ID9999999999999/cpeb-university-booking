import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('bookings')
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

  @Patch(':id/approve')
  approveBooking(@Param('id') id: string, @Body() body: any) {
    return this.bookingsService.approveBooking({
      bookingId: id,
      actorId: body.actorId,
    });
  }

  @Patch(':id/reject')
  rejectBooking(@Param('id') id: string, @Body() body: any) {
    return this.bookingsService.rejectBooking({
      bookingId: id,
      actorId: body.actorId,
      reason: body.reason,
    });
  }
}