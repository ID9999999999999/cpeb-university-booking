import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RepairTicketsController } from './repair-tickets.controller';
import { RepairTicketsService } from './repair-tickets.service';

@Module({
  imports: [PrismaModule],
  controllers: [RepairTicketsController],
  providers: [RepairTicketsService],
})
export class RepairTicketsModule {}