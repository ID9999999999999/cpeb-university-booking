import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ResendVerificationDto, VerifyEmailDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register') register(@Body() body: RegisterDto) { return this.authService.register(body); }
  @Post('verify-email') verifyEmail(@Body() body: VerifyEmailDto) { return this.authService.verifyEmail(body); }
  @Post('resend-verification') resendVerification(@Body() body: ResendVerificationDto) { return this.authService.resendVerification(body); }
  @Post('login') login(@Body() body: LoginDto) { return this.authService.login(body); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me') getCurrentUser(@Request() request: any) { return request.user; }
}
