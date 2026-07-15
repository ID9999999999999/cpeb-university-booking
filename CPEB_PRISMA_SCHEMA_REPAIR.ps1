param(
  [string]$Root = "C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Step([string]$m) {
  Write-Host "`n=== $m ===" -ForegroundColor Cyan
}

function WriteUtf8([string]$path, [string]$content) {
  [System.IO.File]::WriteAllText(
    $path,
    $content,
    [System.Text.UTF8Encoding]::new($false)
  )
}

$api = Join-Path $Root "apps\api"
$android = Join-Path $Root "apps\android"
$schemaPath = Join-Path $api "prisma\schema.prisma"
$bookingPath = Join-Path $api "src\bookings\bookings.service.ts"

if (!(Test-Path $api)) { throw "API folder not found: $api" }
if (!(Test-Path $android)) { throw "Android folder not found: $android" }
if (!(Test-Path $bookingPath)) { throw "Bookings service not found: $bookingPath" }

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = Join-Path $Root "backups\PRISMA_SCHEMA_REPAIR_$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

if (Test-Path $schemaPath) {
  Copy-Item $schemaPath (Join-Path $backup "schema.prisma")
}
Copy-Item $bookingPath (Join-Path $backup "bookings.service.ts")

Step "Restoring valid Prisma schema"

$schema = @'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum UserRole {
  STUDENT
  TEACHER
  LAB_MANAGER
  TECHNICIAN
  ADMIN
}

enum EquipmentStatus {
  AVAILABLE
  RESERVED
  CHECKED_OUT
  UNDER_MAINTENANCE
  LOST
  RETIRED
}

enum BookingStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
  CHECKED_OUT
  RETURNED
  CLOSED
}

enum MaintenanceStatus {
  SCHEDULED
  ACTIVE
  COMPLETED
  CANCELLED
}

enum RepairTicketStatus {
  OPEN
  DIAGNOSING
  WAITING_PARTS
  READY_FOR_TEST
  RESOLVED
  CLOSED
}

model User {
  id       String   @id @default(cuid())
  fullName String
  email    String   @unique
  password String
  role     UserRole @default(STUDENT)
  isActive Boolean  @default(true)

  bookings         Booking[]
  auditLogs        AuditLog[]     @relation("ActorAuditLogs")
  repairTickets    RepairTicket[] @relation("TechnicianTickets")
  submittedReports RepairTicket[] @relation("ReporterTickets")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Equipment {
  id           String          @id @default(cuid())
  name         String
  category     String
  inventoryTag String          @unique
  location     String?
  status       EquipmentStatus @default(AVAILABLE)
  description  String?

  bookings            Booking[]
  maintenanceRecords  MaintenanceRecord[]
  repairTickets       RepairTicket[]
  auditLogs           AuditLog[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([category])
  @@index([status])
}

model Booking {
  id          String        @id @default(cuid())
  equipmentId String
  userId      String
  startTime   DateTime
  endTime     DateTime
  status      BookingStatus @default(PENDING)
  reason      String?

  equipment Equipment @relation(fields: [equipmentId], references: [id])
  user      User      @relation(fields: [userId], references: [id])
  auditLogs AuditLog[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([equipmentId, startTime, endTime])
  @@index([userId])
  @@index([status])
}

model MaintenanceRecord {
  id          String            @id @default(cuid())
  equipmentId String
  title       String
  description String?
  startTime   DateTime
  endTime     DateTime
  status      MaintenanceStatus @default(SCHEDULED)

  equipment Equipment @relation(fields: [equipmentId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([equipmentId, startTime, endTime])
  @@index([status])
}

model RepairTicket {
  id           String             @id @default(cuid())
  equipmentId  String
  technicianId String?
  reporterId   String?
  title        String
  description  String?
  diagnosis    String?
  evidenceUrl  String?
  status       RepairTicketStatus @default(OPEN)

  equipment  Equipment @relation(fields: [equipmentId], references: [id])
  technician User?     @relation("TechnicianTickets", fields: [technicianId], references: [id])
  reporter   User?     @relation("ReporterTickets", fields: [reporterId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([equipmentId])
  @@index([technicianId])
  @@index([reporterId])
  @@index([status])
}

model AuditLog {
  id          String  @id @default(cuid())
  actorId     String?
  equipmentId String?
  bookingId   String?
  action      String
  entityType  String
  entityId    String?
  metadata    Json?

  actor     User?      @relation("ActorAuditLogs", fields: [actorId], references: [id])
  equipment Equipment? @relation(fields: [equipmentId], references: [id])
  booking   Booking?   @relation(fields: [bookingId], references: [id])

  createdAt DateTime @default(now())

  @@index([actorId])
  @@index([equipmentId])
  @@index([bookingId])
  @@index([action])
}
'@

WriteUtf8 $schemaPath $schema

Step "Repairing TypeScript enum comparisons"

$booking = Get-Content -LiteralPath $bookingPath -Raw

$booking = $booking.Replace(
  "[EquipmentStatus.UNDER_MAINTENANCE,EquipmentStatus.LOST,EquipmentStatus.RETIRED].includes(eq.status)",
  "(eq.status === EquipmentStatus.UNDER_MAINTENANCE || eq.status === EquipmentStatus.LOST || eq.status === EquipmentStatus.RETIRED)"
)

$booking = $booking.Replace(
  "![BookingStatus.PENDING,BookingStatus.APPROVED].includes(x.status)",
  "(x.status !== BookingStatus.PENDING && x.status !== BookingStatus.APPROVED)"
)

$booking = $booking.Replace(
  "[BookingStatus.CANCELLED,BookingStatus.REJECTED,BookingStatus.CLOSED].includes(x.status)",
  "(x.status === BookingStatus.CANCELLED || x.status === BookingStatus.REJECTED || x.status === BookingStatus.CLOSED)"
)

WriteUtf8 $bookingPath $booking

Step "Running Prisma from API folder"

Push-Location $api
try {
  npx.cmd prisma format --schema ".\prisma\schema.prisma"
  if ($LASTEXITCODE -ne 0) { throw "prisma format failed" }

  npx.cmd prisma db push --schema ".\prisma\schema.prisma"
  if ($LASTEXITCODE -ne 0) { throw "prisma db push failed" }

  npx.cmd prisma generate --schema ".\prisma\schema.prisma"
  if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }

  npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }
}
finally {
  Pop-Location
}

Step "Building Android"

Push-Location $android
try {
  .\gradlew.bat assembleDebug
  if ($LASTEXITCODE -ne 0) { throw "Android build failed" }
}
finally {
  Pop-Location
}

Step "Saving repaired state"

Push-Location $Root
try {
  git add .
  git commit -m "Repair Prisma schema and enhancement build"
}
finally {
  Pop-Location
}

$apk = Join-Path $android "app\build\outputs\apk\debug\app-debug.apk"

Write-Host "`nSUCCESS" -ForegroundColor Green
Write-Host "Backup: $backup"
Write-Host "APK: $apk"
