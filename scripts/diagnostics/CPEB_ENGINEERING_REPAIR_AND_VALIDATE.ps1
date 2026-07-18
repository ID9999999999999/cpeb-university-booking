param(
  [string]$Root = "C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Step([string]$Message) {
  Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Fail([string]$Message) {
  throw $Message
}

function Need([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    Fail "Required path not found: $Path"
  }
}

function WriteUtf8([string]$Path, [string]$Content) {
  [System.IO.File]::WriteAllText(
    $Path,
    $Content,
    [System.Text.UTF8Encoding]::new($false)
  )
}

function RunChecked([string]$Label, [scriptblock]$Command) {
  Step $Label
  & $Command
  if ($LASTEXITCODE -ne 0) {
    Fail "$Label failed with exit code $LASTEXITCODE"
  }
}

$api = Join-Path $Root "apps\api"
$android = Join-Path $Root "apps\android"
$adminService = Join-Path $api "src\admin\admin.service.ts"
$appModule = Join-Path $api "src\app.module.ts"
$schemaPath = Join-Path $api "prisma\schema.prisma"

Need $api
Need $android
Need $adminService
Need $appModule
Need $schemaPath
Need (Join-Path $api "package.json")
Need (Join-Path $android "gradlew.bat")

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = Join-Path $Root "backups\ENGINEERING_REPAIR_$timestamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

Step "Creating precise safety backup"
Copy-Item $adminService (Join-Path $backup "admin.service.ts")
Copy-Item $appModule (Join-Path $backup "app.module.ts")
Copy-Item $schemaPath (Join-Path $backup "schema.prisma")

Step "Inspecting current project state"

$serviceText = Get-Content -LiteralPath $adminService -Raw
$appText = Get-Content -LiteralPath $appModule -Raw
$schemaText = Get-Content -LiteralPath $schemaPath -Raw

if ($serviceText -notmatch 'class\s+AdminService') {
  Fail "admin.service.ts does not contain AdminService."
}

if ($appText -notmatch '\bAdminModule\b') {
  Fail "AdminModule is not registered in app.module.ts."
}

if ($schemaText -notmatch 'model\s+AuditLog\s*\{') {
  Fail "Prisma schema does not contain AuditLog."
}

if ($schemaText -notmatch 'metadata\s+Json\?') {
  Fail "AuditLog.metadata is not declared as Json?."
}

Step "Repairing Prisma JSON metadata typing adaptively"

# Ensure Prisma is imported from @prisma/client.
$importPattern = 'import\s*\{(?<members>[\s\S]*?)\}\s*from\s*[\'"]@prisma/client[\'"];'
$importMatch = [regex]::Match($serviceText, $importPattern)

if (-not $importMatch.Success) {
  Fail "Could not locate the @prisma/client import in admin.service.ts."
}

$members = $importMatch.Groups["members"].Value
if ($members -notmatch '(^|,|\s)Prisma($|,|\s)') {
  $newMembers = " Prisma," + $members
  $newImport = $importMatch.Value.Replace($members, $newMembers)
  $serviceText = $serviceText.Remove($importMatch.Index, $importMatch.Length).Insert($importMatch.Index, $newImport)
  Write-Host "Added Prisma import." -ForegroundColor Green
} else {
  Write-Host "Prisma import already present." -ForegroundColor Yellow
}

# Replace only metadata property assignments in AuditLog create calls.
$patterns = @(
  @{
    Pattern = 'metadata\s*\}\s*\}\s*\)'
    Replacement = 'metadata: metadata as Prisma.InputJsonValue | undefined}})'
  },
  @{
    Pattern = 'metadata\s*\}\s*\}\s*\)\s*\}'
    Replacement = 'metadata: metadata as Prisma.InputJsonValue | undefined}})}'
  },
  @{
    Pattern = 'metadata\s*:\s*metadata(?!\s+as\s+Prisma\.InputJsonValue)'
    Replacement = 'metadata: metadata as Prisma.InputJsonValue | undefined'
  }
)

$before = $serviceText
foreach ($item in $patterns) {
  $serviceText = [regex]::Replace(
    $serviceText,
    $item.Pattern,
    $item.Replacement,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
}

if ($serviceText -eq $before -and $serviceText -notmatch 'metadata\s*:\s*metadata\s+as\s+Prisma\.InputJsonValue') {
  # Target the compact one-line helper exactly if still present.
  $compactPattern = 'private\s+log\((?<args>[\s\S]*?)\)\s*\{\s*return\s+this\.(?<client>\w+)\.auditLog\.create\(\{\s*data:\s*\{(?<data>[\s\S]*?)\}\s*\}\)\s*\}'
  $compactMatch = [regex]::Match($serviceText, $compactPattern)

  if ($compactMatch.Success) {
    $data = $compactMatch.Groups["data"].Value
    if ($data -match '(^|,)\s*metadata\s*($|,)') {
      $newData = [regex]::Replace(
        $data,
        '(^|,)\s*metadata\s*($|,)',
        '$1 metadata: metadata as Prisma.InputJsonValue | undefined$2'
      )
      $newBlock = $compactMatch.Value.Replace($data, $newData)
      $serviceText = $serviceText.Remove($compactMatch.Index, $compactMatch.Length).Insert($compactMatch.Index, $newBlock)
    }
  }
}

if ($serviceText -notmatch 'metadata\s*:\s*metadata\s+as\s+Prisma\.InputJsonValue') {
  Fail "Could not safely repair the metadata assignment."
}

WriteUtf8 $adminService $serviceText
Write-Host "Prisma JSON metadata typing repaired." -ForegroundColor Green

Step "Formatting and validating Prisma schema"
Push-Location $api
try {
  & npx.cmd prisma format --schema ".\prisma\schema.prisma"
  if ($LASTEXITCODE -ne 0) {
    Fail "Prisma format failed."
  }

  & npx.cmd prisma validate --schema ".\prisma\schema.prisma"
  if ($LASTEXITCODE -ne 0) {
    Fail "Prisma validation failed."
  }

  & npx.cmd prisma generate --schema ".\prisma\schema.prisma"
  if ($LASTEXITCODE -ne 0) {
    Fail "Prisma Client generation failed."
  }
}
finally {
  Pop-Location
}

RunChecked "Building Backend" {
  Push-Location $api
  try {
    & npm.cmd run build
  }
  finally {
    Pop-Location
  }
}

RunChecked "Building Android APK" {
  Push-Location $android
  try {
    & .\gradlew.bat assembleDebug
  }
  finally {
    Pop-Location
  }
}

Step "Verifying build artifacts"
$apk = Join-Path $android "app\build\outputs\apk\debug\app-debug.apk"
Need $apk

$distCandidates = @(
  (Join-Path $api "dist\main.js"),
  (Join-Path $api "dist\src\main.js")
)

if (-not ($distCandidates | Where-Object { Test-Path -LiteralPath $_ })) {
  Write-Host "Backend build succeeded; dist entry point location differs from common layouts." -ForegroundColor Yellow
}

Step "Committing only repaired administration files"
Push-Location $Root
try {
  git add `
    "apps/api/src/admin/admin.service.ts" `
    "apps/api/src/admin/admin.controller.ts" `
    "apps/api/src/admin/admin.module.ts" `
    "apps/api/src/app.module.ts" `
    "apps/api/prisma/seed-admin.cjs"

  $status = git diff --cached --name-only
  if ([string]::IsNullOrWhiteSpace(($status -join ""))) {
    Write-Host "No new staged changes; nothing to commit." -ForegroundColor Yellow
  } else {
    git commit -m "Complete protected administration operations"
    if ($LASTEXITCODE -ne 0) {
      Fail "Git commit failed."
    }
  }
}
finally {
  Pop-Location
}

Write-Host "`nSUCCESS" -ForegroundColor Green
Write-Host "Backend build: SUCCESS"
Write-Host "Android build: SUCCESS"
Write-Host "Administration API: READY"
Write-Host "Backup: $backup"
Write-Host "APK: $apk"
