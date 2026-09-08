import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateRepairTicketDto } from './repair-tickets.dto';
import { RepairTicketsService } from './repair-tickets.service';

@ApiTags('Repair tickets')
@ApiBearerAuth()
@Controller('repair-tickets')
@UseGuards(AuthGuard('jwt'))
export class RepairTicketsController {
  constructor(private readonly s: RepairTicketsService) {}
  private uid(r: any) { return r.user?.userId ?? r.user?.id ?? r.user?.sub; }
  @Get('mine') mine(@Request() r: any) { return this.s.mine(this.uid(r)); }
  @Post() create(@Request() r: any, @Body() b: CreateRepairTicketDto) {
    return this.s.create({ equipmentId: b.equipmentId, reporterId: this.uid(r), title: b.title, description: b.description });
  }
}
