param([string]$Root="C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES")
$ErrorActionPreference="Stop"
Set-StrictMode -Version Latest

function Step([string]$m){Write-Host "`n=== $m ===" -ForegroundColor Cyan}
function Need([string]$p){if(!(Test-Path -LiteralPath $p)){throw "Missing: $p"}}
function WriteUtf8([string]$p,[string]$c){[IO.File]::WriteAllText($p,$c,[Text.UTF8Encoding]::new($false))}

$api=Join-Path $Root "apps\api"
$android=Join-Path $Root "apps\android"
$booking=Join-Path $api "src\bookings\bookings.service.ts"
$repair=Join-Path $api "src\repair-tickets\repair-tickets.service.ts"
$schema=Join-Path $api "prisma\schema.prisma"
Need $booking; Need $repair; Need $schema

$stamp=Get-Date -Format "yyyyMMdd_HHmmss"
$backup=Join-Path $Root "backups\PRODUCT_ENHANCEMENT_REPAIR_$stamp"
New-Item -ItemType Directory -Force -Path $backup|Out-Null
Copy-Item $booking (Join-Path $backup "bookings.service.ts")
Copy-Item $repair (Join-Path $backup "repair-tickets.service.ts")
Copy-Item $schema (Join-Path $backup "schema.prisma")

Step "Repairing TypeScript enum comparisons"
$t=Get-Content -LiteralPath $booking -Raw
$t=$t.Replace("[EquipmentStatus.UNDER_MAINTENANCE,EquipmentStatus.LOST,EquipmentStatus.RETIRED].includes(eq.status)","(eq.status === EquipmentStatus.UNDER_MAINTENANCE || eq.status === EquipmentStatus.LOST || eq.status === EquipmentStatus.RETIRED)")
$t=$t.Replace("![BookingStatus.PENDING,BookingStatus.APPROVED].includes(x.status)","(x.status !== BookingStatus.PENDING && x.status !== BookingStatus.APPROVED)")
$t=$t.Replace("[BookingStatus.CANCELLED,BookingStatus.REJECTED,BookingStatus.CLOSED].includes(x.status)","(x.status === BookingStatus.CANCELLED || x.status === BookingStatus.REJECTED || x.status === BookingStatus.CLOSED)")
WriteUtf8 $booking $t

Step "Synchronizing Prisma"
Push-Location $api
try{
  npx.cmd prisma db push
  if($LASTEXITCODE-ne 0){throw "prisma db push failed"}
  npx.cmd prisma generate
  if($LASTEXITCODE-ne 0){throw "prisma generate failed"}
  npm.cmd run build
  if($LASTEXITCODE-ne 0){throw "Backend build failed"}
}finally{Pop-Location}

Step "Building Android"
Push-Location $android
try{
  .\gradlew.bat assembleDebug
  if($LASTEXITCODE-ne 0){throw "Android build failed"}
}finally{Pop-Location}

Step "Committing"
Push-Location $Root
try{
  git add .
  git commit -m "Repair product enhancement build"
}finally{Pop-Location}

$apk=Join-Path $android "app\build\outputs\apk\debug\app-debug.apk"
Write-Host "`nSUCCESS" -ForegroundColor Green
Write-Host "Backup: $backup"
Write-Host "APK: $apk"
