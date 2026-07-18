param(
  [string]$Root = "C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES",
  [string]$SmtpHost = "",
  [int]$SmtpPort = 587,
  [string]$SmtpUser = "",
  [string]$SmtpPassword = "",
  [string]$MailFrom = ""
)

$ErrorActionPreference = "Stop"

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Replace-Exact([string]$Text, [string]$Old, [string]$New, [string]$Label) {
  if (-not $Text.Contains($Old)) {
    throw "PATCH_ABORTED: expected block not found: $Label"
  }
  return $Text.Replace($Old, $New)
}

$Api = Join-Path $Root "apps\api"
$Android = Join-Path $Root "apps\android"
$Schema = Join-Path $Api "prisma\schema.prisma"
$AuthController = Join-Path $Api "src\auth\auth.controller.ts"
$AuthService = Join-Path $Api "src\auth\auth.service.ts"
$RealApi = Join-Path $Android "app\src\main\java\com\yasser\ub\real\RealApi.kt"
$AppUi = Join-Path $Android "app\src\main\java\com\yasser\ub\real\CpebRealApp.kt"
$EnvFile = Join-Path $Api ".env"

$Required = @($Schema, $AuthController, $AuthService, $RealApi, $AppUi)
foreach ($f in $Required) {
  if (-not (Test-Path $f)) { throw "FILE_NOT_FOUND: $f" }
}

if ([string]::IsNullOrWhiteSpace($SmtpHost)) { $SmtpHost = Read-Host "SMTP host (example: smtp.gmail.com)" }
if ([string]::IsNullOrWhiteSpace($SmtpUser)) { $SmtpUser = Read-Host "SMTP username/email" }
if ([string]::IsNullOrWhiteSpace($SmtpPassword)) {
  $secure = Read-Host "SMTP password/app-password" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $SmtpPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
if ([string]::IsNullOrWhiteSpace($MailFrom)) { $MailFrom = $SmtpUser }

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Backup = Join-Path $Root "backups\REGISTRATION_EMAIL_$stamp"
New-Item -ItemType Directory -Force -Path $Backup | Out-Null

foreach ($f in $Required) {
  $relative = $f.Substring($Root.Length).TrimStart('\')
  $dest = Join-Path $Backup $relative
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  Copy-Item $f $dest -Force
}
if (Test-Path $EnvFile) {
  $dest = Join-Path $Backup "apps\api\.env"
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  Copy-Item $EnvFile $dest -Force
}

try {
  # Prisma: existing users remain verified; new registrations explicitly set false.
  $schemaText = Get-Content $Schema -Raw
  if (-not $schemaText.Contains("emailVerified")) {
    $schemaText = Replace-Exact $schemaText `
      "  isActive Boolean  @default(true)" `
      "  isActive                 Boolean   @default(true)`r`n  emailVerified            Boolean   @default(true)`r`n  verificationCodeHash      String?`r`n  verificationCodeExpiresAt DateTime?" `
      "Prisma User verification fields"
    Write-Utf8NoBom $Schema $schemaText
  }

  $controllerText = @'
import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body()
    body: {
      fullName: string;
      email: string;
      password: string;
    },
  ) {
    return this.authService.register(body);
  }

  @Post('verify-email')
  verifyEmail(@Body() body: { email: string; code: string }) {
    return this.authService.verifyEmail(body);
  }

  @Post('resend-verification')
  resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerification(body);
  }

  @Post('login')
  login(
    @Body()
    body: {
      email: string;
      password: string;
    },
  ) {
    return this.authService.login(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getCurrentUser(@Request() request: any) {
    return request.user;
  }
}
'@
  Write-Utf8NoBom $AuthController $controllerText

  $serviceText = @'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { randomInt } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  private createCode() {
    return randomInt(100000, 1000000).toString();
  }

  private async sendVerificationEmail(email: string, code: string) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const from = process.env.MAIL_FROM || user;

    if (!host || !user || !pass || !from) {
      throw new ServiceUnavailableException(
        'Email service is not configured',
      );
    }

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transport.sendMail({
      from,
      to: email,
      subject: 'CPEB email verification code',
      text: `Your CPEB verification code is ${code}. It expires in 10 minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
          <h2>CPEB email verification</h2>
          <p>Use this code to activate your account:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</div>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });
  }

  private async issueVerificationCode(userId: string, email: string) {
    const code = this.createCode();
    const verificationCodeHash = await bcrypt.hash(code, 10);
    const verificationCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationCodeHash,
        verificationCodeExpiresAt,
      },
    });

    try {
      await this.sendVerificationEmail(email, code);
    } catch (error) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          verificationCodeHash: null,
          verificationCodeExpiresAt: null,
        },
      });
      throw error;
    }
  }

  async register(input: {
    fullName: string;
    email: string;
    password: string;
  }) {
    const email = this.normalizeEmail(input.email);
    const fullName = input.fullName.trim();

    if (!fullName || !email || input.password.length < 6) {
      throw new BadRequestException('Invalid registration information');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser?.emailVerified) {
      throw new ConflictException('Email is already registered');
    }

    if (existingUser && !existingUser.emailVerified) {
      const hashedPassword = await bcrypt.hash(input.password, 12);
      const user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          fullName,
          password: hashedPassword,
          isActive: true,
        },
      });

      await this.issueVerificationCode(user.id, user.email);
      return {
        requiresVerification: true,
        email: user.email,
        message: 'Verification code sent',
      };
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const user = await this.prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role: 'STUDENT',
        isActive: true,
        emailVerified: false,
      },
    });

    try {
      await this.issueVerificationCode(user.id, user.email);
    } catch (error) {
      await this.prisma.user.delete({ where: { id: user.id } });
      throw error;
    }

    return {
      requiresVerification: true,
      email: user.email,
      message: 'Verification code sent',
    };
  }

  async verifyEmail(input: { email: string; code: string }) {
    const email = this.normalizeEmail(input.email);
    const code = input.code.trim();

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (
      !user ||
      user.emailVerified ||
      !user.verificationCodeHash ||
      !user.verificationCodeExpiresAt
    ) {
      throw new BadRequestException('Invalid verification request');
    }

    if (user.verificationCodeExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Verification code has expired');
    }

    const valid = await bcrypt.compare(code, user.verificationCodeHash);
    if (!valid) {
      throw new BadRequestException('Invalid verification code');
    }

    const verifiedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCodeHash: null,
        verificationCodeExpiresAt: null,
      },
    });

    return this.createAuthenticationResponse(verifiedUser);
  }

  async resendVerification(input: { email: string }) {
    const email = this.normalizeEmail(input.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return { message: 'If the account exists, a code was sent' };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.issueVerificationCode(user.id, user.email);
    return { message: 'Verification code sent' };
  }

  async login(input: { email: string; password: string }) {
    const email = this.normalizeEmail(input.email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordIsValid = await bcrypt.compare(
      input.password,
      user.password,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Email verification is required');
    }

    return this.createAuthenticationResponse(user);
  }

  private async createAuthenticationResponse(user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  }) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }
}
'@
  Write-Utf8NoBom $AuthService $serviceText

  $realApiText = @'
package com.yasser.ub.real
import android.content.Context
import com.google.gson.annotations.SerializedName
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

data class UserDto(val id:String,val fullName:String,val email:String,val role:String)
data class AuthResponse(@SerializedName("accessToken") val accessToken:String,val user:UserDto)
data class RegisterResponse(val requiresVerification:Boolean,val email:String,val message:String)
data class MessageResponse(val message:String)
data class LoginBody(val email:String,val password:String)
data class RegisterBody(val fullName:String,val email:String,val password:String)
data class VerifyEmailBody(val email:String,val code:String)
data class ResendVerificationBody(val email:String)
data class EquipmentDto(val id:String,val name:String,val category:String,val inventoryTag:String,val location:String?,val status:String,val description:String?)
data class BookingBody(val equipmentId:String,val startTime:String,val endTime:String,val reason:String?)
data class BookingDto(val id:String,val startTime:String,val endTime:String,val status:String,val reason:String?,val equipment:EquipmentDto)
data class AvailabilityDto(val available:Boolean,val reason:String)
data class ReportBody(val equipmentId:String,val title:String,val description:String?)
data class ReportDto(val id:String,val title:String,val description:String?,val status:String,val createdAt:String,val equipment:EquipmentDto)

interface RealApi {
 @POST("auth/login") suspend fun login(@Body b:LoginBody):AuthResponse
 @POST("auth/register") suspend fun register(@Body b:RegisterBody):RegisterResponse
 @POST("auth/verify-email") suspend fun verifyEmail(@Body b:VerifyEmailBody):AuthResponse
 @POST("auth/resend-verification") suspend fun resendVerification(@Body b:ResendVerificationBody):MessageResponse
 @GET("equipment") suspend fun equipment(@Header("Authorization")a:String):List<EquipmentDto>
 @GET("bookings/mine") suspend fun bookings(@Header("Authorization")a:String):List<BookingDto>
 @GET("bookings/availability") suspend fun availability(@Header("Authorization")a:String,@Query("equipmentId")id:String,@Query("startTime")s:String,@Query("endTime")e:String):AvailabilityDto
 @POST("bookings") suspend fun book(@Header("Authorization")a:String,@Body b:BookingBody):BookingDto
 @PATCH("bookings/{id}/cancel") suspend fun cancel(@Header("Authorization")a:String,@Path("id")id:String):BookingDto
 @PATCH("bookings/{id}/finish") suspend fun finish(@Header("Authorization")a:String,@Path("id")id:String):BookingDto
 @GET("repair-tickets/mine") suspend fun reports(@Header("Authorization")a:String):List<ReportDto>
 @POST("repair-tickets") suspend fun report(@Header("Authorization")a:String,@Body b:ReportBody):ReportDto
}

class Session(c:Context) {
 private val p=c.getSharedPreferences("cpeb_session",0)
 var token:String? get()=p.getString("token",null);set(v){p.edit().putString("token",v).apply()}
 var name:String? get()=p.getString("name",null);set(v){p.edit().putString("name",v).apply()}
 fun clear()=p.edit().clear().apply()
 fun bearer()="Bearer ${token?:""}"
}

object ApiFactory {
 const val BASE_URL="http://10.190.66.192:3000/"
 val api:RealApi by lazy {
   Retrofit.Builder()
     .baseUrl(BASE_URL)
     .addConverterFactory(GsonConverterFactory.create())
     .build()
     .create(RealApi::class.java)
 }
}
'@
  Write-Utf8NoBom $RealApi $realApiText

  $ui = Get-Content $AppUi -Raw

  $ui = Replace-Exact $ui `
    'private enum class Screen { LOGIN, REGISTER, HOME, RESOURCES, DETAILS, BOOK, BOOKINGS, REPORTS, PROFILE }' `
    'private enum class Screen { LOGIN, REGISTER, VERIFY, HOME, RESOURCES, DETAILS, BOOK, BOOKINGS, REPORTS, PROFILE }' `
    "Android screen enum"

  $ui = Replace-Exact $ui `
    '  var selected by remember { mutableStateOf<EquipmentDto?>(null) }' `
    '  var selected by remember { mutableStateOf<EquipmentDto?>(null) }`r`n  var pendingEmail by remember { mutableStateOf("") }' `
    "pending email state"

  $ui = Replace-Exact $ui `
    '        if (screen !in listOf(Screen.LOGIN, Screen.REGISTER)) {' `
    '        if (screen !in listOf(Screen.LOGIN, Screen.REGISTER, Screen.VERIFY)) {' `
    "hide navigation during verification"

  $oldRegister = @'
          Screen.REGISTER -> Register(
            loading, error,
            onBack = { error = ""; screen = Screen.LOGIN },
            onCreate = { name, email, password ->
              scope.launch {
                loading = true
                error = ""
                try {
                  val r = ApiFactory.api.register(RegisterBody(name.trim(), email.trim(), password))
                  session.token = r.accessToken
                  session.name = r.user.fullName
                  notice = "Account created"
                  screen = Screen.HOME
                  refresh()
                } catch (t: Throwable) {
                  error = readable(t)
                } finally {
                  loading = false
                }
              }
            }
          )

'@

  $newRegister = @'
          Screen.REGISTER -> Register(
            loading, error,
            onBack = { error = ""; screen = Screen.LOGIN },
            onCreate = { name, email, password ->
              scope.launch {
                loading = true
                error = ""
                try {
                  val r = ApiFactory.api.register(RegisterBody(name.trim(), email.trim(), password))
                  pendingEmail = r.email
                  notice = r.message
                  screen = Screen.VERIFY
                } catch (t: Throwable) {
                  error = readable(t)
                } finally {
                  loading = false
                }
              }
            }
          )

          Screen.VERIFY -> VerifyEmail(
            email = pendingEmail,
            loading = loading,
            error = error,
            onVerify = { code ->
              scope.launch {
                loading = true
                error = ""
                try {
                  val r = ApiFactory.api.verifyEmail(VerifyEmailBody(pendingEmail, code))
                  session.token = r.accessToken
                  session.name = r.user.fullName
                  notice = "Email verified"
                  screen = Screen.HOME
                  refresh()
                } catch (t: Throwable) {
                  error = readable(t)
                } finally {
                  loading = false
                }
              }
            },
            onResend = {
              scope.launch {
                loading = true
                error = ""
                try {
                  val r = ApiFactory.api.resendVerification(ResendVerificationBody(pendingEmail))
                  notice = r.message
                } catch (t: Throwable) {
                  error = readable(t)
                } finally {
                  loading = false
                }
              }
            },
            onBack = {
              error = ""
              pendingEmail = ""
              screen = Screen.LOGIN
            }
          )

'@

  $ui = Replace-Exact $ui $oldRegister $newRegister "Android registration flow"

  $verifyComposable = @'

@Composable
private fun VerifyEmail(
  email: String,
  loading: Boolean,
  error: String,
  onVerify: (String) -> Unit,
  onResend: () -> Unit,
  onBack: () -> Unit
) {
  var code by remember { mutableStateOf("") }
  val cleanCode = code.filter { it.isDigit() }.take(6)

  Page("Verify your email", "A six-digit code was sent to $email") {
    OutlinedTextField(
      value = cleanCode,
      onValueChange = { code = it.filter(Char::isDigit).take(6) },
      label = { Text("Verification code") },
      singleLine = true,
      modifier = Modifier.fillMaxWidth()
    )
    if (error.isNotBlank()) ErrorText(error)
    Button(
      onClick = { onVerify(cleanCode) },
      enabled = !loading && cleanCode.length == 6,
      modifier = Modifier.fillMaxWidth()
    ) {
      Text(if (loading) "Verifying…" else "Verify and continue")
    }
    OutlinedButton(
      onClick = onResend,
      enabled = !loading,
      modifier = Modifier.fillMaxWidth()
    ) {
      Text("Resend code")
    }
    TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
      Text("Back to sign in")
    }
  }
}
'@

  $marker = "`r`n@Composable`r`nprivate fun Home("
  if (-not $ui.Contains($marker)) {
    $marker = "`n@Composable`nprivate fun Home("
  }
  if (-not $ui.Contains($marker)) { throw "PATCH_ABORTED: VerifyEmail insertion marker not found" }
  $ui = $ui.Replace($marker, "$verifyComposable$marker")
  Write-Utf8NoBom $AppUi $ui

  # Update .env without destroying unrelated settings.
  $envText = if (Test-Path $EnvFile) { Get-Content $EnvFile -Raw } else { "" }
  $settings = [ordered]@{
    SMTP_HOST = $SmtpHost
    SMTP_PORT = $SmtpPort.ToString()
    SMTP_USER = $SmtpUser
    SMTP_PASSWORD = $SmtpPassword
    MAIL_FROM = $MailFrom
  }

  foreach ($key in $settings.Keys) {
    $escaped = [Regex]::Escape($key)
    $line = "$key=$($settings[$key])"
    if ($envText -match "(?m)^$escaped=.*$") {
      $envText = [Regex]::Replace($envText, "(?m)^$escaped=.*$", $line)
    } else {
      if ($envText.Length -gt 0 -and -not $envText.EndsWith("`n")) { $envText += "`r`n" }
      $envText += "$line`r`n"
    }
  }
  Write-Utf8NoBom $EnvFile $envText

  Push-Location $Api
  try {
    npm install nodemailer
    npm install --save-dev @types/nodemailer
    npx prisma format
    npx prisma db push
    npx prisma generate
    npm run build
    npm test -- --runInBand
  } finally {
    Pop-Location
  }

  Push-Location $Android
  try {
    .\gradlew.bat testDebugUnitTest
    .\gradlew.bat assembleDebug
  } finally {
    Pop-Location
  }

  Write-Host ""
  Write-Host "SUCCESS: registration + real email OTP is built." -ForegroundColor Green
  Write-Host "Backup: $Backup"
  Write-Host "DEV APK: $Android\app\build\outputs\apk\debug\app-debug.apk"
  Write-Host ""
  Write-Host "Start backend with:"
  Write-Host "cd `"$Api`"; npm run start:dev"
}
catch {
  Write-Host ""
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host "Restoring modified source files from backup..." -ForegroundColor Yellow

  foreach ($f in $Required) {
    $relative = $f.Substring($Root.Length).TrimStart('\')
    $src = Join-Path $Backup $relative
    if (Test-Path $src) { Copy-Item $src $f -Force }
  }

  $envBackup = Join-Path $Backup "apps\api\.env"
  if (Test-Path $envBackup) {
    Copy-Item $envBackup $EnvFile -Force
  }

  throw "FAILED_AND_ROLLED_BACK. Backup retained at: $Backup"
}
