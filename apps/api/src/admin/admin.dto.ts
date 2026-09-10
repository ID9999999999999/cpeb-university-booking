import {
  BookingStatus,
  EquipmentStatus,
  MaintenanceStatus,
  RepairTicketStatus,
  UserRole,
} from '@prisma/client';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RejectBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class AdminCreateEquipmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  inventoryTag!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
}

export class AdminEquipmentStatusDto {
  @ApiProperty({ enum: EquipmentStatus })
  @IsEnum(EquipmentStatus)
  status!: EquipmentStatus;
}

export class ReportStatusDto {
  @ApiProperty({ enum: RepairTicketStatus })
  @IsEnum(RepairTicketStatus)
  status!: RepairTicketStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  diagnosis?: string;
}

export class AssignReportDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  technicianId!: string;
}

export class AdminCreateMaintenanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  equipmentId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiProperty()
  @IsISO8601()
  startTime!: string;

  @ApiProperty()
  @IsISO8601()
  endTime!: string;
}

export class AdminMaintenanceStatusDto {
  @ApiProperty({ enum: MaintenanceStatus })
  @IsEnum(MaintenanceStatus)
  status!: MaintenanceStatus;
}

export class UsersQueryDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  active?: string;
}

export class BookingsQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}

export class EquipmentQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ enum: EquipmentStatus })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;
}

export class ReportsQueryDto {
  @ApiPropertyOptional({ enum: RepairTicketStatus })
  @IsOptional()
  @IsEnum(RepairTicketStatus)
  status?: RepairTicketStatus;
}

export class MaintenanceQueryDto {
  @ApiPropertyOptional({ enum: MaintenanceStatus })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;
}

export class AuditQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  take?: number;
}
