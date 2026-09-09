import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateRepairTicketDto } from './repair-tickets.dto';
import { RepairTicketsService } from './repair-tickets.service';

@ApiTags('Repair tickets')
@ApiBearerAuth()
@Controller('repair-tickets')
@UseGuards(AuthGuard('jwt'))
export class RepairTicketsController {
  constructor(private readonly service: RepairTicketsService) {}

  private uid(request: any) {
    return request.user?.userId ?? request.user?.id ?? request.user?.sub;
  }

  @Get('mine')
  mine(@Request() request: any) {
    return this.service.mine(this.uid(request));
  }

  @Get(':id')
  findOne(@Request() request: any, @Param('id') id: string) {
    return this.service.findOne(id, this.uid(request));
  }

  @Post()
  create(@Request() request: any, @Body() body: CreateRepairTicketDto) {
    return this.service.create({
      equipmentId: body.equipmentId,
      reporterId: this.uid(request),
      title: body.title,
      description: body.description,
      evidenceUrl: body.evidenceUrl,
    });
  }
}
