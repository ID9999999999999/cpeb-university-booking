$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

$ProjectRoot = "C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES"

if (-not (Test-Path -LiteralPath $ProjectRoot)) {
    $ProjectRoot = (Get-Location).Path
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ReportPath = Join-Path $ProjectRoot "CPEB_DIAGNOSTIC_$Stamp.txt"
$RuntimeLog = Join-Path $env:TEMP "CPEB_RUNTIME_$Stamp.log"
$RunnerFile = Join-Path $env:TEMP "CPEB_RUNTIME_$Stamp.cmd"

$ReportLines = New-Object 'System.Collections.Generic.List[string]'

function Write-Report {
    param([string]$Text = "")

    $script:ReportLines.Add($Text)
    Write-Host $Text
}

function Write-Section {
    param([string]$Title)

    Write-Report ""
    Write-Report ("=" * 90)
    Write-Report $Title
    Write-Report ("=" * 90)
}

function Invoke-DiagnosticCommand {
    param(
        [string]$Title,
        [string]$Command,
        [string]$WorkingDirectory,
        [int]$MaximumLines = 250
    )

    Write-Section $Title
    Write-Report "Directory: $WorkingDirectory"
    Write-Report "Command:   $Command"
    Write-Report ""

    Push-Location $WorkingDirectory

    try {
        $Output = @(& $env:ComSpec /d /s /c "$Command 2>&1")
        $ExitCode = $LASTEXITCODE

        Write-Report "Exit code: $ExitCode"
        Write-Report ""

        if ($Output.Count -gt $MaximumLines) {
            Write-Report "[Only the last $MaximumLines lines are shown]"
            $Output = $Output[($Output.Count - $MaximumLines)..($Output.Count - 1)]
        }

        foreach ($Line in $Output) {
            Write-Report ([string]$Line)
        }
    }
    catch {
        Write-Report "COMMAND EXCEPTION: $($_.Exception.Message)"
    }
    finally {
        Pop-Location
    }
}

function Read-DotEnvFile {
    param([string]$Path)

    $Result = @{}

    if (-not (Test-Path -LiteralPath $Path)) {
        return $Result
    }

    foreach ($Line in Get-Content -LiteralPath $Path -ErrorAction SilentlyContinue) {
        if ($Line -match '^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
            $Name = $Matches[1]
            $Value = $Matches[2].Trim()

            if (
                ($Value.StartsWith('"') -and $Value.EndsWith('"')) -or
                ($Value.StartsWith("'") -and $Value.EndsWith("'"))
            ) {
                if ($Value.Length -ge 2) {
                    $Value = $Value.Substring(1, $Value.Length - 2)
                }
            }

            $Result[$Name] = $Value
        }
    }

    return $Result
}

function Get-FirstEnvironmentValue {
    param(
        [hashtable]$Map,
        [string[]]$Names
    )

    foreach ($Name in $Names) {
        if ($Map.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace($Map[$Name])) {
            return $Map[$Name]
        }
    }

    return $null
}

Write-Section "CPEB BACKEND DIAGNOSTIC REPORT"
Write-Report "Generated:    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Report "Project root: $ProjectRoot"
Write-Report "Computer:     $env:COMPUTERNAME"
Write-Report "Windows user: $env:USERNAME"

Invoke-DiagnosticCommand `
    -Title "SYSTEM VERSIONS" `
    -Command "node --version && npm --version && where node && where npm" `
    -WorkingDirectory $ProjectRoot `
    -MaximumLines 100

Write-Section "SEARCHING FOR THE NESTJS BACKEND"

$PackageFiles = @(
    Get-ChildItem `
        -LiteralPath $ProjectRoot `
        -Filter "package.json" `
        -File `
        -Recurse `
        -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -notmatch '\\node_modules\\|\\dist\\|\\build\\|\\.gradle\\'
    }
)

$NestCandidates = @()

foreach ($PackageFile in $PackageFiles) {
    try {
        $PackageJson = Get-Content -LiteralPath $PackageFile.FullName -Raw |
            ConvertFrom-Json

        $DependencyNames = @()

        if ($null -ne $PackageJson.dependencies) {
            $DependencyNames += @($PackageJson.dependencies.PSObject.Properties.Name)
        }

        if ($null -ne $PackageJson.devDependencies) {
            $DependencyNames += @($PackageJson.devDependencies.PSObject.Properties.Name)
        }

        $IsNest = $DependencyNames -contains "@nestjs/core"

        Write-Report "$($PackageFile.DirectoryName) | NestJS=$IsNest"

        if ($IsNest) {
            $Score = 0

            if ($PackageFile.DirectoryName -match '(?i)backend|server|api') {
                $Score += 20
            }

            if (Test-Path (Join-Path $PackageFile.DirectoryName "src\main.ts")) {
                $Score += 20
            }

            if (Test-Path (Join-Path $PackageFile.DirectoryName "nest-cli.json")) {
                $Score += 10
            }

            $NestCandidates += [PSCustomObject]@{
                Directory   = $PackageFile.DirectoryName
                PackageFile = $PackageFile.FullName
                Json        = $PackageJson
                Score       = $Score
            }
        }
    }
    catch {
        Write-Report "Could not parse: $($PackageFile.FullName)"
        Write-Report "Reason: $($_.Exception.Message)"
    }
}

if ($NestCandidates.Count -eq 0) {
    Write-Section "FATAL RESULT"
    Write-Report "No NestJS package containing @nestjs/core was found."
    Write-Report "Verify that PowerShell is opened inside the CPEB CODES directory."

    Set-Content -LiteralPath $ReportPath -Value $ReportLines -Encoding UTF8
    Write-Host "`nReport saved to: $ReportPath" -ForegroundColor Yellow
    exit 1
}

$SelectedBackend = $NestCandidates |
    Sort-Object Score -Descending |
    Select-Object -First 1

$BackendRoot = $SelectedBackend.Directory
$PackageJson = $SelectedBackend.Json

Write-Report ""
Write-Report "SELECTED BACKEND: $BackendRoot"
Write-Report "Detection score:  $($SelectedBackend.Score)"

Write-Section "PACKAGE.JSON - SCRIPTS"

if ($null -ne $PackageJson.scripts) {
    foreach ($Property in $PackageJson.scripts.PSObject.Properties | Sort-Object Name) {
        Write-Report ("{0,-25} {1}" -f $Property.Name, $Property.Value)
    }
}
else {
    Write-Report "No npm scripts found."
}

Write-Section "RELEVANT BACKEND PACKAGES"

$AllDependencies = @()

if ($null -ne $PackageJson.dependencies) {
    $AllDependencies += @($PackageJson.dependencies.PSObject.Properties)
}

if ($null -ne $PackageJson.devDependencies) {
    $AllDependencies += @($PackageJson.devDependencies.PSObject.Properties)
}

$RelevantPackagePattern =
    'nest|mail|smtp|nodemailer|prisma|typeorm|sequelize|mongoose|postgres|mysql|redis|jwt|passport|winston|pino|bcrypt|argon'

$RelevantDependencies = $AllDependencies |
    Where-Object { $_.Name -match $RelevantPackagePattern } |
    Sort-Object Name -Unique

if ($RelevantDependencies.Count -eq 0) {
    Write-Report "No relevant mail/database/auth/logging packages were detected."
}
else {
    foreach ($Dependency in $RelevantDependencies) {
        Write-Report ("{0,-40} {1}" -f $Dependency.Name, $Dependency.Value)
    }
}

Write-Section "ENVIRONMENT FILES"

$EnvironmentFiles = @(
    Get-ChildItem `
        -LiteralPath $BackendRoot `
        -Force `
        -File `
        -Recurse `
        -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -like ".env*" -and
        $_.FullName -notmatch '\\node_modules\\|\\dist\\|\\build\\'
    }
)

$MergedEnvironment = @{}

if ($EnvironmentFiles.Count -eq 0) {
    Write-Report "ERROR: No .env file was found inside the selected backend."
}
else {
    foreach ($EnvironmentFile in $EnvironmentFiles) {
        Write-Report ""
        Write-Report "FILE: $($EnvironmentFile.FullName)"

        $EnvironmentMap = Read-DotEnvFile $EnvironmentFile.FullName

        if ($EnvironmentMap.Count -eq 0) {
            Write-Report "  Empty or unreadable environment file."
            continue
        }

        foreach ($Key in $EnvironmentMap.Keys | Sort-Object) {
            $Value = [string]$EnvironmentMap[$Key]

            $IsExampleFile = $EnvironmentFile.Name -match '(?i)example|sample|template'
            if (-not $IsExampleFile) {
                $MergedEnvironment[$Key] = $Value
            }

            $LooksLikePlaceholder =
                $Value -match '(?i)change.?me|replace.?me|your[_-]|example\.com|xxxxx|todo'

            $SafeExactKeys = @(
                "NODE_ENV",
                "PORT",
                "SMTP_HOST",
                "SMTP_PORT",
                "MAIL_HOST",
                "MAIL_PORT",
                "EMAIL_HOST",
                "EMAIL_PORT",
                "DB_HOST",
                "DB_PORT",
                "DATABASE_HOST",
                "DATABASE_PORT"
            )

            if ([string]::IsNullOrWhiteSpace($Value)) {
                $ShownValue = "<EMPTY>"
            }
            elseif ($SafeExactKeys -contains $Key) {
                $ShownValue = $Value
            }
            else {
                $ShownValue = "<SET, length=$($Value.Length)>"
            }

            if ($LooksLikePlaceholder) {
                $ShownValue += "  [POSSIBLE PLACEHOLDER]"
            }

            Write-Report ("  {0,-35} {1}" -f $Key, $ShownValue)
        }
    }
}

Write-Section "REQUIRED EMAIL CONFIGURATION"

$ConfigurationGroups = [ordered]@{
    "SMTP host" = @("SMTP_HOST", "MAIL_HOST", "EMAIL_HOST")
    "SMTP port" = @("SMTP_PORT", "MAIL_PORT", "EMAIL_PORT")
    "SMTP user" = @("SMTP_USER", "MAIL_USER", "EMAIL_USER")
    "SMTP password" = @(
        "SMTP_PASS",
        "SMTP_PASSWORD",
        "MAIL_PASS",
        "MAIL_PASSWORD",
        "EMAIL_PASS",
        "EMAIL_PASSWORD"
    )
    "Sender address" = @(
        "MAIL_FROM",
        "EMAIL_FROM",
        "SMTP_FROM",
        "FROM_EMAIL"
    )
    "Frontend URL" = @(
        "FRONTEND_URL",
        "APP_URL",
        "CLIENT_URL"
    )
    "JWT secret" = @(
        "JWT_SECRET",
        "ACCESS_TOKEN_SECRET",
        "JWT_ACCESS_SECRET"
    )
    "Database configuration" = @(
        "DATABASE_URL",
        "DB_HOST",
        "DATABASE_HOST"
    )
}

foreach ($Group in $ConfigurationGroups.GetEnumerator()) {
    $DetectedNames = @(
        foreach ($CandidateName in $Group.Value) {
            if (
                $MergedEnvironment.ContainsKey($CandidateName) -and
                -not [string]::IsNullOrWhiteSpace($MergedEnvironment[$CandidateName])
            ) {
                $CandidateName
            }
        }
    )

    if ($DetectedNames.Count -gt 0) {
        Write-Report ("[OK]      {0,-25} via {1}" -f $Group.Key, ($DetectedNames -join ", "))
    }
    else {
        Write-Report ("[MISSING] {0,-25} expected one of: {1}" -f $Group.Key, ($Group.Value -join ", "))
    }
}

Write-Section "ENVIRONMENT VARIABLES REFERENCED BY SOURCE CODE"

$SourceFiles = @(
    Get-ChildItem `
        -LiteralPath (Join-Path $BackendRoot "src") `
        -Filter "*.ts" `
        -File `
        -Recurse `
        -ErrorAction SilentlyContinue
)

$ReferencedEnvironmentKeys =
    New-Object 'System.Collections.Generic.HashSet[string]'

foreach ($SourceFile in $SourceFiles) {
    try {
        $SourceContent = Get-Content -LiteralPath $SourceFile.FullName -Raw

        foreach ($Match in [regex]::Matches(
            $SourceContent,
            'process\.env\.([A-Za-z_][A-Za-z0-9_]*)'
        )) {
            [void]$ReferencedEnvironmentKeys.Add($Match.Groups[1].Value)
        }

        foreach ($Match in [regex]::Matches(
            $SourceContent,
            '(?:configService|this\.configService)\.(?:get|getOrThrow)(?:<[^>]+>)?\(\s*[''"]([A-Z][A-Z0-9_]*)[''"]'
        )) {
            [void]$ReferencedEnvironmentKeys.Add($Match.Groups[1].Value)
        }
    }
    catch {
        Write-Report "Could not inspect: $($SourceFile.FullName)"
    }
}

if ($ReferencedEnvironmentKeys.Count -eq 0) {
    Write-Report "No direct environment references were detected."
}
else {
    foreach ($Key in @($ReferencedEnvironmentKeys) | Sort-Object) {
        if (
            $MergedEnvironment.ContainsKey($Key) -and
            -not [string]::IsNullOrWhiteSpace($MergedEnvironment[$Key])
        ) {
            Write-Report "[FOUND]   $Key"
        }
        else {
            Write-Report "[MISSING] $Key"
        }
    }
}

Write-Section "EMAIL / VERIFICATION / AUTH / LOGGING SOURCE MAP"

$SearchPattern =
    'verify-email|resend-verification|verificationCode|verification_code|' +
    'emailVerification|email_verification|OTP|one.?time|' +
    'nodemailer|MailerService|sendMail|smtp|mailTransport|' +
    'Logger|console\.(log|error|warn|debug)|winston|pino|' +
    'register|login|bcrypt|argon|jwt'

$MatchesShown = 0
$MaximumMatches = 350

foreach ($SourceFile in $SourceFiles) {
    if ($MatchesShown -ge $MaximumMatches) {
        break
    }

    $Matches = Select-String `
        -LiteralPath $SourceFile.FullName `
        -Pattern $SearchPattern `
        -AllMatches `
        -CaseSensitive:$false `
        -ErrorAction SilentlyContinue

    foreach ($Match in $Matches) {
        if ($MatchesShown -ge $MaximumMatches) {
            break
        }

        $RelativePath = $Match.Path.Substring($BackendRoot.Length).TrimStart("\")
        $SafeLine = $Match.Line.Trim()

        $SafeLine = [regex]::Replace(
            $SafeLine,
            '(?i)(password|pass|secret|token|api[_-]?key)(\s*[:=]\s*)([^,;\)\}]+)',
            '$1$2<REDACTED>'
        )

        if ($SafeLine.Length -gt 240) {
            $SafeLine = $SafeLine.Substring(0, 240) + "..."
        }

        Write-Report ("{0}:{1} | {2}" -f $RelativePath, $Match.LineNumber, $SafeLine)
        $MatchesShown++
    }
}

if ($MatchesShown -eq 0) {
    Write-Report "No matching email/auth/logging implementation was found."
}
elseif ($MatchesShown -ge $MaximumMatches) {
    Write-Report ""
    Write-Report "[Output stopped after $MaximumMatches source matches.]"
}

Write-Section "IMPORTANT FILE INVENTORY"

$ImportantFilePattern =
    'auth|mail|email|verification|otp|user|database|prisma|typeorm|logger|logging|main\.ts|app\.module'

$ImportantFiles = $SourceFiles |
    Where-Object {
        $_.Name -match $ImportantFilePattern -or
        $_.DirectoryName -match $ImportantFilePattern
    } |
    Sort-Object FullName

foreach ($File in $ImportantFiles) {
    Write-Report $File.FullName
}

Invoke-DiagnosticCommand `
    -Title "NPM DEPENDENCY HEALTH" `
    -Command "npm ls --depth=0" `
    -WorkingDirectory $BackendRoot `
    -MaximumLines 300

Invoke-DiagnosticCommand `
    -Title "NESTJS BUILD" `
    -Command "npm run build" `
    -WorkingDirectory $BackendRoot `
    -MaximumLines 400

$PrismaSchema = Get-ChildItem `
    -LiteralPath $BackendRoot `
    -Filter "schema.prisma" `
    -File `
    -Recurse `
    -ErrorAction SilentlyContinue |
    Select-Object -First 1

$HasPrismaDependency =
    @($AllDependencies.Name) -contains "prisma" -or
    @($AllDependencies.Name) -contains "@prisma/client"

if ($null -ne $PrismaSchema -and $HasPrismaDependency) {
    Invoke-DiagnosticCommand `
        -Title "PRISMA SCHEMA VALIDATION" `
        -Command "npx prisma validate" `
        -WorkingDirectory $BackendRoot `
        -MaximumLines 250

    Invoke-DiagnosticCommand `
        -Title "PRISMA DATABASE STATUS - READ ONLY" `
        -Command "npx prisma migrate status" `
        -WorkingDirectory $BackendRoot `
        -MaximumLines 250
}
else {
    Write-Section "DATABASE TOOL DETECTION"
    Write-Report "Prisma schema/dependency was not detected."
    Write-Report "Database connectivity will therefore be evaluated from NestJS startup logs."
}

Write-Section "SMTP NETWORK CONNECTIVITY"

$SmtpHost = Get-FirstEnvironmentValue `
    -Map $MergedEnvironment `
    -Names @("SMTP_HOST", "MAIL_HOST", "EMAIL_HOST")

$SmtpPortText = Get-FirstEnvironmentValue `
    -Map $MergedEnvironment `
    -Names @("SMTP_PORT", "MAIL_PORT", "EMAIL_PORT")

$SmtpPort = 0
[void][int]::TryParse([string]$SmtpPortText, [ref]$SmtpPort)

if (
    -not [string]::IsNullOrWhiteSpace($SmtpHost) -and
    $SmtpPort -gt 0
) {
    Write-Report "Testing TCP connection to $SmtpHost`:$SmtpPort"

    try {
        $SmtpTest = Test-NetConnection `
            -ComputerName $SmtpHost `
            -Port $SmtpPort `
            -WarningAction SilentlyContinue

        Write-Report "Remote address: $($SmtpTest.RemoteAddress)"
        Write-Report "TCP succeeded:  $($SmtpTest.TcpTestSucceeded)"

        if (-not $SmtpTest.TcpTestSucceeded) {
            Write-Report "SMTP server is unreachable on the configured port."
        }
    }
    catch {
        Write-Report "SMTP TEST ERROR: $($_.Exception.Message)"
    }
}
else {
    Write-Report "SMTP host or port is missing, so the network test could not run."
}

Write-Section "LISTENING PORTS BEFORE BACKEND STARTUP"

try {
    $ListeningPorts = Get-NetTCPConnection `
        -State Listen `
        -ErrorAction Stop |
    Where-Object {
        $_.LocalPort -in @(3000, 3001, 3002, 4000, 5432, 6379, 1025, 8025)
    } |
    Sort-Object LocalPort

    if ($ListeningPorts.Count -eq 0) {
        Write-Report "No common CPEB service ports are currently listening."
    }
    else {
        foreach ($Connection in $ListeningPorts) {
            Write-Report (
                "Port={0} Address={1} PID={2}" -f
                $Connection.LocalPort,
                $Connection.LocalAddress,
                $Connection.OwningProcess
            )
        }
    }
}
catch {
    Write-Report "Port inspection failed: $($_.Exception.Message)"
}

$ScriptNames = @()

if ($null -ne $PackageJson.scripts) {
    $ScriptNames = @($PackageJson.scripts.PSObject.Properties.Name)
}

if ($ScriptNames -contains "start:dev") {
    $StartScript = "start:dev"
}
elseif ($ScriptNames -contains "start") {
    $StartScript = "start"
}
else {
    $StartScript = $null
}

Write-Section "TEMPORARY BACKEND STARTUP TEST"

if ($null -eq $StartScript) {
    Write-Report "No start or start:dev npm script was found."
}
else {
    Write-Report "Starting: npm run $StartScript"
    Write-Report "Runtime log: $RuntimeLog"

    @(
        "@echo off"
        "cd /d `"$BackendRoot`""
        "npm run $StartScript > `"$RuntimeLog`" 2>&1"
    ) | Set-Content -LiteralPath $RunnerFile -Encoding ASCII

    try {
        $RuntimeProcess = Start-Process `
            -FilePath $env:ComSpec `
            -ArgumentList "/d /s /c `"$RunnerFile`"" `
            -WindowStyle Hidden `
            -PassThru

        Start-Sleep -Seconds 18

        $ApplicationPort = 3000

        if (
            $MergedEnvironment.ContainsKey("PORT") -and
            $MergedEnvironment["PORT"] -match '^\d+$'
        ) {
            $ApplicationPort = [int]$MergedEnvironment["PORT"]
        }

        Write-Report ""
        Write-Report "HTTP reachability check: http://127.0.0.1:$ApplicationPort/auth/me"

        try {
            $Response = Invoke-WebRequest `
                -Uri "http://127.0.0.1:$ApplicationPort/auth/me" `
                -Method GET `
                -UseBasicParsing `
                -TimeoutSec 6 `
                -ErrorAction Stop

            Write-Report "HTTP status: $([int]$Response.StatusCode)"
            Write-Report "The NestJS HTTP server is reachable."
        }
        catch {
            $StatusCode = $null

            if ($null -ne $_.Exception.Response) {
                try {
                    $StatusCode = [int]$_.Exception.Response.StatusCode
                }
                catch {
                    $StatusCode = $null
                }
            }

            if ($null -ne $StatusCode) {
                Write-Report "HTTP status: $StatusCode"
                Write-Report "The server is reachable; this response may be expected for protected /auth/me."
            }
            else {
                Write-Report "HTTP check failed: $($_.Exception.Message)"
            }
        }

        if (-not $RuntimeProcess.HasExited) {
            & taskkill.exe /PID $RuntimeProcess.Id /T /F 2>&1 | Out-Null
        }

        Start-Sleep -Seconds 2
    }
    catch {
        Write-Report "STARTUP TEST EXCEPTION: $($_.Exception.Message)"
    }
    finally {
        if (
            $null -ne $RuntimeProcess -and
            -not $RuntimeProcess.HasExited
        ) {
            & taskkill.exe /PID $RuntimeProcess.Id /T /F 2>&1 | Out-Null
        }
    }

    Write-Report ""
    Write-Report "----- COMPLETE NESTJS STARTUP LOG -----"

    if (Test-Path -LiteralPath $RuntimeLog) {
        $RuntimeLines = @(Get-Content -LiteralPath $RuntimeLog -ErrorAction SilentlyContinue)

        if ($RuntimeLines.Count -gt 700) {
            Write-Report "[Only the last 700 runtime lines are shown]"
            $RuntimeLines =
                $RuntimeLines[($RuntimeLines.Count - 700)..($RuntimeLines.Count - 1)]
        }

        foreach ($RuntimeLine in $RuntimeLines) {
            Write-Report ([string]$RuntimeLine)
        }
    }
    else {
        Write-Report "Runtime log file was not created."
    }
}

Write-Section "AUTOMATIC PROBLEM INDICATORS"

$CombinedReport = $ReportLines -join "`n"

$Indicators = [ordered]@{
    "Compilation/build failure" =
        'npm ERR!|error TS\d+|Found \d+ error|ELIFECYCLE'

    "Missing environment value" =
        'MISSING|is not defined|Missing environment|Environment variable.*required'

    "Database failure" =
        'ECONNREFUSED.*5432|P1001|P1000|database.*failed|Unable to connect to the database'

    "SMTP authentication failure" =
        'EAUTH|Invalid login|authentication unsuccessful|Username and Password not accepted|535[- ]'

    "SMTP network failure" =
        'ETIMEDOUT|ECONNREFUSED.*(?:465|587|25)|ENOTFOUND.*smtp|TCP succeeded:\s+False'

    "TLS/SSL mail failure" =
        'self signed certificate|wrong version number|certificate.*expired|TLS|SSL routines'

    "Port already occupied" =
        'EADDRINUSE|address already in use'

    "Dependency injection failure" =
        'Nest can''t resolve dependencies|UnknownDependenciesException'

    "Prisma schema/migration failure" =
        'Prisma schema validation|P\d{4}|migration.*failed'

    "Verification implementation missing" =
        'No matching email/auth/logging implementation was found'
}

$AnyIndicator = $false

foreach ($Indicator in $Indicators.GetEnumerator()) {
    if ($CombinedReport -match $Indicator.Value) {
        Write-Report "[DETECTED] $($Indicator.Key)"
        $AnyIndicator = $true
    }
}

if (-not $AnyIndicator) {
    Write-Report "No single known signature was conclusive."
    Write-Report "The build, startup log and source map above contain the detailed evidence."
}

Write-Section "REPORT END"
Write-Report "Backend selected: $BackendRoot"

Set-Content `
    -LiteralPath $ReportPath `
    -Value $ReportLines `
    -Encoding UTF8

try {
    Get-Content -LiteralPath $ReportPath -Raw | Set-Clipboard
    Write-Host ""
    Write-Host "DIAGNOSTIC COMPLETE." -ForegroundColor Green
    Write-Host "The full report has been copied to your clipboard." -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "DIAGNOSTIC COMPLETE, but clipboard copy failed." -ForegroundColor Yellow
}

Write-Host "Report file:" -ForegroundColor Cyan
Write-Host $ReportPath -ForegroundColor White
Write-Host ""
Write-Host "Paste the report into ChatGPT or upload the TXT file." -ForegroundColor Cyan
