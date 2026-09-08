import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Yasser Student' })
  @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: 'student@example.edu' })
  @IsEmail() @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'StrongPassword123', minLength: 6 })
  @IsString() @MinLength(6) @MaxLength(128)
  password!: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'student@example.edu' })
  @IsEmail() @MaxLength(254)
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString() @Matches(/^\d{6}$/)
  code!: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'student@example.edu' })
  @IsEmail() @MaxLength(254)
  email!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'student@example.edu' })
  @IsEmail() @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'StrongPassword123' })
  @IsString() @IsNotEmpty() @MaxLength(128)
  password!: string;
}
