import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class BookingAvailabilityQueryDto {
  @ApiProperty() @IsString() @IsNotEmpty() equipmentId!: string;
  @ApiProperty({ example: '2026-09-10T09:00:00.000Z' }) @IsISO8601() startTime!: string;
  @ApiProperty({ example: '2026-09-10T10:00:00.000Z' }) @IsISO8601() endTime!: string;
}

export class CreateBookingDto {
  @ApiProperty() @IsString() @IsNotEmpty() equipmentId!: string;
  @ApiProperty({ example: '2026-09-10T09:00:00.000Z' }) @IsISO8601() startTime!: string;
  @ApiProperty({ example: '2026-09-10T10:00:00.000Z' }) @IsISO8601() endTime!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}
