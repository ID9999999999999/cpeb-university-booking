import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class BookingAvailabilityQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  equipmentId!: string;

  @ApiProperty({ example: '2026-09-10T09:00:00.000Z' })
  @IsISO8601()
  startTime!: string;

  @ApiProperty({ example: '2026-09-10T10:00:00.000Z' })
  @IsISO8601()
  endTime!: string;
}

export class CreateBookingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  equipmentId!: string;

  @ApiProperty({ example: '2026-09-10T09:00:00.000Z' })
  @IsISO8601()
  startTime!: string;

  @ApiProperty({ example: '2026-09-10T10:00:00.000Z' })
  @IsISO8601()
  endTime!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class RateBookingDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
