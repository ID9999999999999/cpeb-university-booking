param(
    [Parameter(Mandatory=$true)]
    [string]$BackendUrl,

    [Parameter(Mandatory=$false)]
    [string]$TestEmail
)

$ErrorActionPreference = "Stop"
$base = $BackendUrl.Trim().TrimEnd('/')
if (-not $base.StartsWith('https://')) {
    throw "Committee backend must use HTTPS. Received: $base"
}

function Get-Json([string]$Path) {
    Invoke-RestMethod -Method Get -Uri "$base$Path" -TimeoutSec 20
}

Write-Host "CPEB committee preflight" -ForegroundColor Cyan
Write-Host "Backend: $base"

$health = Get-Json '/health'
if ($health.status -ne 'ok') { throw "API health check failed" }
Write-Host "[OK] API health" -ForegroundColor Green

$db = Get-Json '/db-health'
if ($db.database -ne 'connected') { throw "Database health check failed" }
Write-Host "[OK] PostgreSQL connected" -ForegroundColor Green

$ready = Get-Json '/readiness'
if ($ready.status -ne 'ready') { throw "Readiness check failed" }
if ([int]$ready.resources -lt 1) { throw "No resources are loaded" }
if ($ready.mailTransport -ne 'connected') { throw "SMTP transport is not connected" }
Write-Host "[OK] Readiness: $($ready.resources) resources, mail transport connected" -ForegroundColor Green

if ($TestEmail) {
    $stamp = Get-Date -Format 'yyyyMMddHHmmss'
    $studentId = "PREFLIGHT-$stamp"
    $password = "Preflight-$([guid]::NewGuid().ToString('N').Substring(0,16))!Aa1"
    $body = @{
        fullName = 'CPEB Preflight Student'
        studentId = $studentId
        email = $TestEmail.Trim()
        password = $password
    } | ConvertTo-Json

    $registration = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType 'application/json' -Body $body -TimeoutSec 30
    if (-not $registration.requiresVerification) {
        throw "Registration did not enter the email verification flow"
    }
    Write-Host "[OK] Registration accepted for $($registration.email)" -ForegroundColor Green
    Write-Host "CHECK THE INBOX NOW: a real six-digit CPEB verification email must arrive." -ForegroundColor Yellow
    Write-Host "This script deliberately does not expose or bypass the verification code." -ForegroundColor Yellow
} else {
    Write-Host "No TestEmail supplied. Network/DB/SMTP connection checks passed, but inbox delivery was NOT tested." -ForegroundColor Yellow
}
