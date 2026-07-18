param(
  [string]$Root = "C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Step([string]$Message) {
  Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Need([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Required file not found: $Path"
  }
}

function WriteUtf8([string]$Path, [string]$Content) {
  [System.IO.File]::WriteAllText(
    $Path,
    $Content,
    [System.Text.UTF8Encoding]::new($false)
  )
}

$api = Join-Path $Root "apps\api"
$android = Join-Path $Root "apps\android"
$servicePath = Join-Path $api "src\admin\admin.service.ts"

Need $servicePath
Need (Join-Path $api "package.json")
Need (Join-Path $api "prisma\schema.prisma")
Need (Join-Path $android "gradlew.bat")

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = Join-Path $Root "backups\ADMIN_FINAL_REPAIR_$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
Copy-Item $servicePath (Join-Path $backup "admin.service.ts")

Step "Reading current admin service"
$text = Get-Content -LiteralPath $servicePath -Raw

Step "Ensuring Prisma import"
if ($text -notmatch '\bPrisma\b') {
  $marker = "from '@prisma/client';"
  $importStart = $text.IndexOf("import {")
  $importEnd = $text.IndexOf($marker)

  if ($importStart -lt 0 -or $importEnd -lt 0) {
    throw "Could not locate @prisma/client import."
  }

  $braceStart = $text.IndexOf("{", $importStart)
  $text = $text.Insert($braceStart + 1, " Prisma,")
  Write-Host "Prisma import added." -ForegroundColor Green
} else {
  Write-Host "Prisma import already present." -ForegroundColor Yellow
}

Step "Repairing AuditLog metadata typing"
$old1 = 'metadata}})}'
$new1 = 'metadata: metadata as Prisma.InputJsonValue | undefined}})}'

$old2 = 'metadata}})'
$new2 = 'metadata: metadata as Prisma.InputJsonValue | undefined}})'

$old3 = 'metadata:metadata'
$new3 = 'metadata: metadata as Prisma.InputJsonValue | undefined'

$changed = $false

if ($text.Contains($old1)) {
  $text = $text.Replace($old1, $new1)
  $changed = $true
}

if ($text.Contains($old2)) {
  $text = $text.Replace($old2, $new2)
  $changed = $true
}

if ($text.Contains($old3) -and $text -notmatch 'metadata:\s*metadata\s+as\s+Prisma\.InputJsonValue') {
  $text = $text.Replace($old3, $new3)
  $changed = $true
}

if (-not $changed -and $text -notmatch 'metadata:\s*metadata\s+as\s+Prisma\.InputJsonValue') {
  throw "Could not find the metadata assignment to repair."
}

WriteUtf8 $servicePath $text

Step "Generating Prisma Client"
Push-Location $api
try {
  & npx.cmd prisma generate --schema ".\prisma\schema.prisma"
  if ($LASTEXITCODE -ne 0) {
    throw "Prisma Client generation failed."
  }

  Step "Building Backend"
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) {
    throw "Backend build failed."
  }
}
finally {
  Pop-Location
}

Step "Building Android APK"
Push-Location $android
try {
  & .\gradlew.bat assembleDebug
  if ($LASTEXITCODE -ne 0) {
    throw "Android build failed."
  }
}
finally {
  Pop-Location
}

Step "Committing administration files"
Push-Location $Root
try {
  git add "apps/api/src/admin" "apps/api/src/app.module.ts" "apps/api/prisma/seed-admin.cjs"

  $staged = git diff --cached --name-only
  if ([string]::IsNullOrWhiteSpace(($staged -join ""))) {
    Write-Host "No staged changes to commit." -ForegroundColor Yellow
  } else {
    git commit -m "Complete protected administration operations"
    if ($LASTEXITCODE -ne 0) {
      throw "Git commit failed."
    }
  }
}
finally {
  Pop-Location
}

$apk = Join-Path $android "app\build\outputs\apk\debug\app-debug.apk"
Need $apk

Write-Host "`nSUCCESS" -ForegroundColor Green
Write-Host "Backend build: SUCCESS"
Write-Host "Android build: SUCCESS"
Write-Host "Administration API: READY"
Write-Host "Backup: $backup"
Write-Host "APK: $apk"
