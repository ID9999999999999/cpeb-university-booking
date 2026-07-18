param(
    [string]$Root = "C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES",
    [switch]$SkipBuild,
    [switch]$SkipRuntimeTests
)

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

# ============================================================
# CPEB PROJECT AUDIT
# READ-ONLY ENGINEERING AUDIT
#
# This script:
# - Does not modify source files.
# - Does not run git add/commit/reset.
# - Does not run Prisma migrations.
# - Does not install dependencies.
# - Produces Markdown and JSON reports.
# ============================================================

$ApiRoot       = Join-Path $Root "apps\api"
$AndroidRoot   = Join-Path $Root "apps\android"
$ReportRoot    = Join-Path $Root "evidence\project-audit"
$Timestamp     = Get-Date -Format "yyyyMMdd_HHmmss"
$MarkdownPath  = Join-Path $ReportRoot "CPEB_PROJECT_AUDIT_$Timestamp.md"
$JsonPath      = Join-Path $ReportRoot "CPEB_PROJECT_AUDIT_$Timestamp.json"
$LatestMdPath  = Join-Path $Root "CPEB_PROJECT_AUDIT.md"
$LatestJsonPath = Join-Path $Root "CPEB_PROJECT_AUDIT.json"

New-Item -ItemType Directory -Force -Path $ReportRoot | Out-Null

$script:Findings = [System.Collections.Generic.List[object]]::new()
$script:CommandEvidence = [System.Collections.Generic.List[object]]::new()

function Add-Finding {
    param(
        [Parameter(Mandatory)]
        [string]$Area,

        [Parameter(Mandatory)]
        [string]$Item,

        [Parameter(Mandatory)]
        [ValidateSet("COMPLETE", "PARTIAL", "MISSING", "FAILED", "UNKNOWN", "INFO")]
        [string]$Status,

        [Parameter(Mandatory)]
        [string]$Evidence,

        [string]$Remaining = ""
    )

    $script:Findings.Add([pscustomobject]@{
        Area      = $Area
        Item      = $Item
        Status    = $Status
        Evidence  = $Evidence
        Remaining = $Remaining
    })
}

function Test-PathAudit {
    param(
        [string]$Area,
        [string]$Item,
        [string]$Path,
        [string]$MissingMessage
    )

    if (Test-Path -LiteralPath $Path) {
        Add-Finding $Area $Item "COMPLETE" "Exists: $Path"
        return $true
    }

    Add-Finding $Area $Item "MISSING" "Not found: $Path" $MissingMessage
    return $false
}

function Invoke-AuditCommand {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [scriptblock]$Command
    )

    $oldLocation = Get-Location
    $output = @()
    $exitCode = $null
    $succeeded = $false

    try {
        Set-Location $WorkingDirectory
        $global:LASTEXITCODE = 0

        $output = @(& $Command 2>&1 | ForEach-Object { "$_" })
        $exitCode = $LASTEXITCODE

        if ($null -eq $exitCode) {
            $exitCode = 0
        }

        $succeeded = ($exitCode -eq 0)
    }
    catch {
        $output += $_.Exception.Message
        $exitCode = -1
        $succeeded = $false
    }
    finally {
        Set-Location $oldLocation
    }

    $script:CommandEvidence.Add([pscustomobject]@{
        Name      = $Name
        Succeeded = $succeeded
        ExitCode  = $exitCode
        Output    = $output
    })

    return [pscustomobject]@{
        Succeeded = $succeeded
        ExitCode  = $exitCode
        Output    = $output
    }
}

function Get-TypeScriptFiles {
    param([string]$BasePath)

    if (-not (Test-Path $BasePath)) {
        return @()
    }

    return @(
        Get-ChildItem $BasePath -Recurse -File -Filter "*.ts" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.FullName -notmatch "\\node_modules\\" -and
            $_.FullName -notmatch "\\dist\\" -and
            $_.FullName -notmatch "\\build\\"
        }
    )
}

function Get-KotlinJavaFiles {
    param([string]$BasePath)

    if (-not (Test-Path $BasePath)) {
        return @()
    }

    return @(
        Get-ChildItem $BasePath -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Extension -in @(".kt", ".java") -and
            $_.FullName -notmatch "\\build\\"
        }
    )
}

function Convert-ToMarkdownCell {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value) {
        return ""
    }

    return ("$Value").Replace("|", "\|").Replace("`r", " ").Replace("`n", "<br>")
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " CPEB PROJECT AUDIT - READ ONLY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host "Timestamp: $Timestamp"
Write-Host ""

# ============================================================
# 1. PROJECT STRUCTURE
# ============================================================

$apiExists = Test-PathAudit `
    "Project Structure" `
    "Backend application" `
    $ApiRoot `
    "Restore or locate apps\api."

$androidExists = Test-PathAudit `
    "Project Structure" `
    "Android application" `
    $AndroidRoot `
    "Restore or locate apps\android."

$packageJsonPath = Join-Path $ApiRoot "package.json"
$schemaPath = Join-Path $ApiRoot "prisma\schema.prisma"
$appModulePath = Join-Path $ApiRoot "src\app.module.ts"
$authModulePath = Join-Path $ApiRoot "src\auth\auth.module.ts"
$adminControllerPath = Join-Path $ApiRoot "src\admin\admin.controller.ts"
$adminServicePath = Join-Path $ApiRoot "src\admin\admin.service.ts"
$gradleWrapperPath = Join-Path $AndroidRoot "gradlew.bat"

Test-PathAudit "Project Structure" "Backend package.json" $packageJsonPath "Create or restore package.json." | Out-Null
Test-PathAudit "Project Structure" "Prisma schema" $schemaPath "Create or restore prisma\schema.prisma." | Out-Null
Test-PathAudit "Project Structure" "Nest AppModule" $appModulePath "Create or restore src\app.module.ts." | Out-Null
Test-PathAudit "Project Structure" "Android Gradle wrapper" $gradleWrapperPath "Restore gradlew.bat." | Out-Null

# ============================================================
# 2. GIT STATE
# ============================================================

$gitRootResult = Invoke-AuditCommand "Git repository root" $Root {
    git rev-parse --show-toplevel
}

if ($gitRootResult.Succeeded) {
    $gitRoot = ($gitRootResult.Output | Select-Object -First 1).Trim()
    Add-Finding "Git" "Repository detected" "COMPLETE" "Git root: $gitRoot"

    $branchResult = Invoke-AuditCommand "Current Git branch" $Root {
        git branch --show-current
    }

    if ($branchResult.Succeeded) {
        $branch = ($branchResult.Output | Select-Object -First 1).Trim()
        Add-Finding "Git" "Current branch" "INFO" $branch
    }

    $headResult = Invoke-AuditCommand "Current commit" $Root {
        git log -1 --pretty=format:"%H|%h|%s|%cI"
    }

    if ($headResult.Succeeded) {
        Add-Finding "Git" "Latest commit" "INFO" ($headResult.Output -join " ")
    }

    $statusResult = Invoke-AuditCommand "Git working tree" $Root {
        git status --porcelain
    }

    if ($statusResult.Succeeded) {
        $statusLines = @($statusResult.Output | Where-Object { $_.Trim() -ne "" })

        if ($statusLines.Count -eq 0) {
            Add-Finding "Git" "Tracked working tree" "COMPLETE" "No tracked or untracked changes."
        }
        else {
            $trackedChanges = @(
                $statusLines |
                Where-Object { $_ -notmatch "^\?\?" }
            )

            $untrackedChanges = @(
                $statusLines |
                Where-Object { $_ -match "^\?\?" }
            )

            if ($trackedChanges.Count -eq 0) {
                Add-Finding `
                    "Git" `
                    "Tracked working tree" `
                    "COMPLETE" `
                    "No tracked source changes. Untracked entries: $($untrackedChanges.Count)."
            }
            else {
                Add-Finding `
                    "Git" `
                    "Tracked working tree" `
                    "PARTIAL" `
                    "$($trackedChanges.Count) tracked change(s) detected." `
                    "Review and commit or discard tracked changes."
            }

            if ($untrackedChanges.Count -gt 0) {
                Add-Finding `
                    "Git" `
                    "Untracked files" `
                    "INFO" `
                    ($untrackedChanges -join "; ")
            }
        }
    }
}
else {
    Add-Finding "Git" "Repository detected" "FAILED" ($gitRootResult.Output -join " ") "Restore the Git repository metadata."
}

# ============================================================
# 3. BACKEND MODULES, CONTROLLERS AND SERVICES
# ============================================================

$backendTsFiles = Get-TypeScriptFiles (Join-Path $ApiRoot "src")

$moduleFiles = @($backendTsFiles | Where-Object { $_.Name -like "*.module.ts" })
$controllerFiles = @($backendTsFiles | Where-Object { $_.Name -like "*.controller.ts" })
$serviceFiles = @($backendTsFiles | Where-Object { $_.Name -like "*.service.ts" })
$guardFiles = @($backendTsFiles | Where-Object { $_.Name -like "*guard*.ts" })
$strategyFiles = @($backendTsFiles | Where-Object { $_.Name -like "*strategy*.ts" })

if ($moduleFiles.Count -gt 0) {
    Add-Finding "Backend Structure" "Nest modules" "COMPLETE" "$($moduleFiles.Count) module file(s): $($moduleFiles.Name -join ', ')"
}
else {
    Add-Finding "Backend Structure" "Nest modules" "MISSING" "No *.module.ts files found." "Implement Nest modules."
}

if ($controllerFiles.Count -gt 0) {
    Add-Finding "Backend Structure" "Controllers" "COMPLETE" "$($controllerFiles.Count) controller file(s)."
}
else {
    Add-Finding "Backend Structure" "Controllers" "MISSING" "No controller files found." "Implement API controllers."
}

if ($serviceFiles.Count -gt 0) {
    Add-Finding "Backend Structure" "Services" "COMPLETE" "$($serviceFiles.Count) service file(s)."
}
else {
    Add-Finding "Backend Structure" "Services" "MISSING" "No service files found." "Implement application services."
}

$expectedModules = @(
    "AuthModule",
    "AdminModule",
    "BookingsModule",
    "EquipmentModule",
    "MaintenanceModule",
    "RepairTicketsModule",
    "AuditLogsModule",
    "PrismaModule"
)

if (Test-Path $appModulePath) {
    $appModuleText = Get-Content $appModulePath -Raw

    foreach ($expectedModule in $expectedModules) {
        if ($appModuleText -match "\b$([regex]::Escape($expectedModule))\b") {
            Add-Finding "Backend Modules" $expectedModule "COMPLETE" "Registered or imported in app.module.ts."
        }
        else {
            Add-Finding "Backend Modules" $expectedModule "MISSING" "Not referenced in app.module.ts." "Register the module if required by project scope."
        }
    }
}

# ============================================================
# 4. API ROUTE INVENTORY
# ============================================================

$routeInventory = [System.Collections.Generic.List[object]]::new()

foreach ($controller in $controllerFiles) {
    $lines = Get-Content $controller.FullName
    $controllerRoute = ""
    $pendingRoles = ""
    $pendingGuards = ""

    foreach ($line in $lines) {
        if ($line -match "@Controller\((?<route>[^)]*)\)") {
            $controllerRoute = $Matches.route.Trim("'`" ")
        }

        if ($line -match "@Roles\((?<roles>[^)]*)\)") {
            $pendingRoles = $Matches.roles.Trim()
        }

        if ($line -match "@UseGuards\((?<guards>[^)]*)\)") {
            $pendingGuards = $Matches.guards.Trim()
        }

        if ($line -match "@(?<verb>Get|Post|Patch|Put|Delete)\((?<route>[^)]*)\)") {
            $verb = $Matches.verb.ToUpperInvariant()
            $route = $Matches.route.Trim("'`" ")

            $fullRoute = "/$controllerRoute"

            if (-not [string]::IsNullOrWhiteSpace($route)) {
                $fullRoute = "$fullRoute/$route"
            }

            $fullRoute = $fullRoute -replace "//+", "/"

            $routeInventory.Add([pscustomobject]@{
                Controller = $controller.Name
                Method     = $verb
                Route      = $fullRoute
                Roles      = $pendingRoles
                Guards     = $pendingGuards
            })

            $pendingRoles = ""
        }
    }
}

if ($routeInventory.Count -gt 0) {
    Add-Finding "API Routes" "Declared routes" "COMPLETE" "$($routeInventory.Count) route declaration(s) found."
}
else {
    Add-Finding "API Routes" "Declared routes" "MISSING" "No Nest route decorators found." "Implement API routes."
}

$expectedRoutes = @(
    @{ Method = "POST";  Route = "/auth/register" },
    @{ Method = "POST";  Route = "/auth/login" },
    @{ Method = "GET";   Route = "/auth/me" },
    @{ Method = "GET";   Route = "/bookings/mine" },
    @{ Method = "GET";   Route = "/bookings/availability" },
    @{ Method = "POST";  Route = "/bookings" },
    @{ Method = "GET";   Route = "/equipment" },
    @{ Method = "GET";   Route = "/admin/dashboard" },
    @{ Method = "GET";   Route = "/admin/users" },
    @{ Method = "GET";   Route = "/admin/bookings" },
    @{ Method = "GET";   Route = "/admin/equipment" },
    @{ Method = "GET";   Route = "/admin/reports" },
    @{ Method = "GET";   Route = "/admin/maintenance" },
    @{ Method = "GET";   Route = "/admin/audit" }
)

foreach ($expected in $expectedRoutes) {
    $match = @(
        $routeInventory |
        Where-Object {
            $_.Method -eq $expected.Method -and
            $_.Route -eq $expected.Route
        }
    )

    if ($match.Count -gt 0) {
        Add-Finding "Expected API Routes" "$($expected.Method) $($expected.Route)" "COMPLETE" "Route declared."
    }
    else {
        Add-Finding "Expected API Routes" "$($expected.Method) $($expected.Route)" "MISSING" "Route not found in static source scan." "Implement or verify this endpoint."
    }
}

# ============================================================
# 5. AUTHENTICATION AND AUTHORIZATION
# ============================================================

$jwtGuardPath = Join-Path $ApiRoot "src\auth\jwt-auth.guard.ts"
$rolesGuardPath = Join-Path $ApiRoot "src\auth\roles.guard.ts"
$rolesDecoratorPath = Join-Path $ApiRoot "src\auth\roles.decorator.ts"
$jwtStrategyPath = Join-Path $ApiRoot "src\auth\jwt.strategy.ts"

Test-PathAudit "Authentication" "JWT guard" $jwtGuardPath "Implement JwtAuthGuard." | Out-Null
Test-PathAudit "Authentication" "JWT strategy" $jwtStrategyPath "Implement JwtStrategy." | Out-Null
Test-PathAudit "Authorization" "Roles guard" $rolesGuardPath "Implement RolesGuard." | Out-Null
Test-PathAudit "Authorization" "Roles decorator" $rolesDecoratorPath "Implement @Roles decorator." | Out-Null

if (Test-Path $adminControllerPath) {
    $adminControllerText = Get-Content $adminControllerPath -Raw

    if ($adminControllerText -match "@UseGuards\(\s*JwtAuthGuard\s*,\s*RolesGuard\s*\)") {
        Add-Finding `
            "Authorization" `
            "Admin guard order" `
            "COMPLETE" `
            "JwtAuthGuard runs before RolesGuard."
    }
    else {
        Add-Finding `
            "Authorization" `
            "Admin guard order" `
            "PARTIAL" `
            "Expected @UseGuards(JwtAuthGuard, RolesGuard) was not found." `
            "Verify that authentication executes before role authorization."
    }

    if ($adminControllerText -match "@Roles\(") {
        Add-Finding "Authorization" "Admin role metadata" "COMPLETE" "@Roles metadata exists on AdminController or its handlers."
    }
    else {
        Add-Finding "Authorization" "Admin role metadata" "MISSING" "No @Roles metadata found in admin.controller.ts." "Protect administrative endpoints with role metadata."
    }
}

if (Test-Path $authModulePath) {
    $authModuleText = Get-Content $authModulePath -Raw

    if ($authModuleText -match "\bAPP_GUARD\b" -and $authModuleText -match "\bRolesGuard\b") {
        Add-Finding `
            "Authorization" `
            "Global RolesGuard ordering risk" `
            "PARTIAL" `
            "RolesGuard appears registered with APP_GUARD." `
            "Confirm that a global authentication guard runs before it."
    }
    else {
        Add-Finding `
            "Authorization" `
            "Global RolesGuard ordering risk" `
            "COMPLETE" `
            "No global RolesGuard registration detected in auth.module.ts."
    }
}

# ============================================================
# 6. PRISMA AND DATABASE SCHEMA
# ============================================================

$prismaModels = [System.Collections.Generic.List[string]]::new()
$prismaEnums = [System.Collections.Generic.List[string]]::new()

if (Test-Path $schemaPath) {
    $schemaText = Get-Content $schemaPath -Raw

    foreach ($match in [regex]::Matches($schemaText, '(?m)^\s*model\s+(?<name>[A-Za-z0-9_]+)\s*\{')) {
        $prismaModels.Add($match.Groups["name"].Value)
    }

    foreach ($match in [regex]::Matches($schemaText, '(?m)^\s*enum\s+(?<name>[A-Za-z0-9_]+)\s*\{')) {
        $prismaEnums.Add($match.Groups["name"].Value)
    }

    Add-Finding "Database Schema" "Prisma models" "INFO" "$($prismaModels.Count) model(s): $($prismaModels -join ', ')"
    Add-Finding "Database Schema" "Prisma enums" "INFO" "$($prismaEnums.Count) enum(s): $($prismaEnums -join ', ')"

    $expectedModels = @(
        "User",
        "Equipment",
        "Booking",
        "MaintenanceRecord",
        "RepairTicket",
        "AuditLog"
    )

    foreach ($model in $expectedModels) {
        if ($prismaModels -contains $model) {
            Add-Finding "Database Models" $model "COMPLETE" "Model exists in schema.prisma."
        }
        else {
            Add-Finding "Database Models" $model "MISSING" "Model not found." "Add the model if required by project scope."
        }
    }
}

$migrationsPath = Join-Path $ApiRoot "prisma\migrations"

if (Test-Path $migrationsPath) {
    $migrationDirectories = @(
        Get-ChildItem $migrationsPath -Directory -ErrorAction SilentlyContinue
    )

    if ($migrationDirectories.Count -gt 0) {
        Add-Finding "Database Schema" "Prisma migrations" "COMPLETE" "$($migrationDirectories.Count) migration directory/directories found."
    }
    else {
        Add-Finding "Database Schema" "Prisma migrations" "PARTIAL" "Migrations directory exists but contains no migration directories." "Create versioned migrations."
    }
}
else {
    Add-Finding "Database Schema" "Prisma migrations" "MISSING" "prisma\migrations not found." "Create and retain database migrations."
}

$envPath = Join-Path $ApiRoot ".env"

if (Test-Path $envPath) {
    $databaseLine = Get-Content $envPath |
        Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } |
        Select-Object -First 1

    if ($databaseLine) {
        $safeDatabaseLine = $databaseLine -replace '(postgres(?:ql)?://[^:]+:)[^@]+@', '$1***@'
        Add-Finding "Database Runtime" "DATABASE_URL" "COMPLETE" $safeDatabaseLine
    }
    else {
        Add-Finding "Database Runtime" "DATABASE_URL" "MISSING" "DATABASE_URL is absent from .env." "Configure the database connection."
    }
}
else {
    Add-Finding "Database Runtime" ".env file" "MISSING" ".env not found." "Create a local environment configuration."
}

# ============================================================
# 7. INCOMPLETE OR SUSPICIOUS SOURCE MARKERS
# ============================================================

$sourceFilesForMarkers = @()
$sourceFilesForMarkers += $backendTsFiles
$sourceFilesForMarkers += Get-KotlinJavaFiles $AndroidRoot

$markerPattern = 'TODO|FIXME|HACK|XXX|NOT_IMPLEMENTED|NotImplemented|throw\s+new\s+Error\s*\(\s*["'']Not implemented|return\s+null\s*;'

$markerHits = @()

foreach ($file in $sourceFilesForMarkers) {
    $hits = Select-String `
        -Path $file.FullName `
        -Pattern $markerPattern `
        -AllMatches `
        -ErrorAction SilentlyContinue

    foreach ($hit in $hits) {
        $markerHits += [pscustomobject]@{
            File       = $file.FullName.Replace($Root, "").TrimStart("\")
            LineNumber = $hit.LineNumber
            Text       = $hit.Line.Trim()
        }
    }
}

if ($markerHits.Count -eq 0) {
    Add-Finding "Static Completeness" "TODO/FIXME/not-implemented markers" "COMPLETE" "No matching markers found in scanned TypeScript/Kotlin/Java source."
}
else {
    Add-Finding `
        "Static Completeness" `
        "TODO/FIXME/not-implemented markers" `
        "PARTIAL" `
        "$($markerHits.Count) suspicious marker(s) found." `
        "Review every marker listed in the detailed report."
}

# ============================================================
# 8. TEST INVENTORY
# ============================================================

$backendTestFiles = @()

if (Test-Path $ApiRoot) {
    $backendTestFiles = @(
        Get-ChildItem $ApiRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
            $_.FullName -notmatch "\\node_modules\\" -and
            $_.FullName -notmatch "\\dist\\" -and
            (
                $_.Name -match '\.(spec|test)\.ts$' -or
                $_.FullName -match '\\test\\'
            )
        }
    )
}

$androidTestFiles = @()

if (Test-Path $AndroidRoot) {
    $androidTestFiles = @(
        Get-ChildItem $AndroidRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
            $_.FullName -notmatch "\\build\\" -and
            (
                $_.FullName -match '\\src\\test\\' -or
                $_.FullName -match '\\src\\androidTest\\'
            )
        }
    )
}

if ($backendTestFiles.Count -gt 0) {
    Add-Finding "Testing" "Backend test files" "PARTIAL" "$($backendTestFiles.Count) test-related file(s) found." "Passing tests must still be verified."
}
else {
    Add-Finding "Testing" "Backend test files" "MISSING" "No backend tests found by static scan." "Add unit and end-to-end tests."
}

if ($androidTestFiles.Count -gt 0) {
    Add-Finding "Testing" "Android test files" "PARTIAL" "$($androidTestFiles.Count) Android test file(s) found." "Passing tests must still be verified."
}
else {
    Add-Finding "Testing" "Android test files" "MISSING" "No Android unit or instrumentation tests found." "Add Android tests."
}

# ============================================================
# 9. ANDROID APPLICATION INVENTORY
# ============================================================

$androidSourceFiles = Get-KotlinJavaFiles $AndroidRoot

if ($androidSourceFiles.Count -gt 0) {
    Add-Finding "Android" "Kotlin/Java source" "COMPLETE" "$($androidSourceFiles.Count) Kotlin/Java source file(s) found."
}
else {
    Add-Finding "Android" "Kotlin/Java source" "MISSING" "No Kotlin or Java source files found." "Implement or restore the Android application."
}

$androidManifestPath = Join-Path $AndroidRoot "app\src\main\AndroidManifest.xml"
Test-PathAudit "Android" "AndroidManifest.xml" $androidManifestPath "Create or restore the Android manifest." | Out-Null

$screenFiles = @(
    $androidSourceFiles |
    Where-Object {
        $_.Name -match 'Activity|Fragment|Screen|ViewModel'
    }
)

if ($screenFiles.Count -gt 0) {
    Add-Finding "Android" "Screens/ViewModels inventory" "INFO" "$($screenFiles.Count) screen, fragment, activity or ViewModel file(s): $($screenFiles.Name -join ', ')"
}
else {
    Add-Finding "Android" "Screens/ViewModels inventory" "UNKNOWN" "No files matched Activity/Fragment/Screen/ViewModel naming conventions." "Inspect UI architecture manually."
}

$networkIndicators = @()

foreach ($file in $androidSourceFiles) {
    $matches = Select-String `
        -Path $file.FullName `
        -Pattern 'Retrofit|OkHttp|HttpURLConnection|ktor|baseUrl|localhost|10\.0\.2\.2|/auth/|/bookings|/equipment|/admin/' `
        -ErrorAction SilentlyContinue

    if ($matches) {
        $networkIndicators += $matches
    }
}

if ($networkIndicators.Count -gt 0) {
    Add-Finding "Android Integration" "Backend API references" "PARTIAL" "$($networkIndicators.Count) network/API reference(s) found." "Runtime verification is still required."
}
else {
    Add-Finding "Android Integration" "Backend API references" "MISSING" "No obvious backend API references found." "Verify Android-to-API integration."
}

# ============================================================
# 10. BUILDS
# ============================================================

if ($SkipBuild) {
    Add-Finding "Build" "Backend build" "UNKNOWN" "Skipped by -SkipBuild."
    Add-Finding "Build" "Android debug APK build" "UNKNOWN" "Skipped by -SkipBuild."
}
else {
    if ($apiExists -and (Test-Path $packageJsonPath)) {
        $backendBuild = Invoke-AuditCommand "Backend build" $ApiRoot {
            npm run build
        }

        if ($backendBuild.Succeeded) {
            Add-Finding "Build" "Backend build" "COMPLETE" "npm run build exited with code 0."
        }
        else {
            Add-Finding "Build" "Backend build" "FAILED" ($backendBuild.Output -join " | ") "Fix backend compilation errors."
        }
    }

    if ($androidExists -and (Test-Path $gradleWrapperPath)) {
        $androidBuild = Invoke-AuditCommand "Android assembleDebug" $AndroidRoot {
            & .\gradlew.bat assembleDebug
        }

        if ($androidBuild.Succeeded) {
            Add-Finding "Build" "Android debug APK build" "COMPLETE" "gradlew.bat assembleDebug exited with code 0."
        }
        else {
            Add-Finding "Build" "Android debug APK build" "FAILED" ($androidBuild.Output -join " | ") "Fix Android build errors."
        }
    }
}

# ============================================================
# 11. BUILD ARTIFACTS
# ============================================================

$backendEntryCandidates = @(
    (Join-Path $ApiRoot "dist\main.js"),
    (Join-Path $ApiRoot "dist\src\main.js")
)

$backendEntry = $backendEntryCandidates |
    Where-Object { Test-Path $_ } |
    Select-Object -First 1

if ($backendEntry) {
    Add-Finding "Artifacts" "Backend compiled entry point" "COMPLETE" $backendEntry
}
else {
    Add-Finding "Artifacts" "Backend compiled entry point" "MISSING" "No common dist main.js path found." "Run and verify the backend build."
}

$apkFiles = @()

if (Test-Path $AndroidRoot) {
    $apkFiles = @(
        Get-ChildItem $AndroidRoot -Recurse -File -Filter "*.apk" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match "\\build\\outputs\\apk\\" } |
        Sort-Object LastWriteTime -Descending
    )
}

if ($apkFiles.Count -gt 0) {
    Add-Finding "Artifacts" "Android APK" "COMPLETE" "$($apkFiles.Count) APK file(s). Latest: $($apkFiles[0].FullName)"
}
else {
    Add-Finding "Artifacts" "Android APK" "MISSING" "No APK found under build\outputs\apk." "Build the Android application."
}

# ============================================================
# 12. RUNTIME HEALTH TESTS
# ============================================================

if ($SkipRuntimeTests) {
    Add-Finding "Runtime" "API connectivity" "UNKNOWN" "Skipped by -SkipRuntimeTests."
    Add-Finding "Runtime" "Database connectivity" "UNKNOWN" "Skipped by -SkipRuntimeTests."
    Add-Finding "Runtime" "Admin dashboard authorization" "UNKNOWN" "Skipped by -SkipRuntimeTests."
}
else {
    $port3000 = Test-NetConnection -ComputerName "localhost" -Port 3000 -WarningAction SilentlyContinue
    $port5432 = Test-NetConnection -ComputerName "localhost" -Port 5432 -WarningAction SilentlyContinue

    if ($port3000.TcpTestSucceeded) {
        Add-Finding "Runtime" "API port 3000" "COMPLETE" "localhost:3000 accepts TCP connections."
    }
    else {
        Add-Finding "Runtime" "API port 3000" "FAILED" "localhost:3000 is not accepting connections." "Start the NestJS backend."
    }

    if ($port5432.TcpTestSucceeded) {
        Add-Finding "Runtime" "PostgreSQL port 5432" "COMPLETE" "localhost:5432 accepts TCP connections."
    }
    else {
        Add-Finding "Runtime" "PostgreSQL port 5432" "FAILED" "localhost:5432 is not accepting connections." "Start PostgreSQL and repair its Windows service."
    }

    if ($port3000.TcpTestSucceeded) {
        try {
            $health = Invoke-RestMethod `
                -Uri "http://localhost:3000/health" `
                -Method Get `
                -TimeoutSec 10

            Add-Finding "Runtime" "GET /health" "COMPLETE" ($health | ConvertTo-Json -Compress -Depth 10)
        }
        catch {
            Add-Finding "Runtime" "GET /health" "FAILED" $_.Exception.Message "Repair or verify the health endpoint."
        }

        try {
            $dbHealth = Invoke-RestMethod `
                -Uri "http://localhost:3000/db-health" `
                -Method Get `
                -TimeoutSec 10

            Add-Finding "Runtime" "GET /db-health" "COMPLETE" ($dbHealth | ConvertTo-Json -Compress -Depth 10)
        }
        catch {
            Add-Finding "Runtime" "GET /db-health" "FAILED" $_.Exception.Message "Repair database connectivity or the db-health endpoint."
        }

        $adminEmail = "admin@university.test"
        $adminPassword = "Admin2026!"

        try {
            $loginBody = @{
                email    = $adminEmail
                password = $adminPassword
            } | ConvertTo-Json

            $login = Invoke-RestMethod `
                -Uri "http://localhost:3000/auth/login" `
                -Method Post `
                -ContentType "application/json" `
                -Body $loginBody `
                -TimeoutSec 15

            if ($login.accessToken) {
                Add-Finding "Runtime" "Admin login" "COMPLETE" "JWT access token returned for the audit admin account."

                try {
                    $dashboard = Invoke-RestMethod `
                        -Uri "http://localhost:3000/admin/dashboard" `
                        -Method Get `
                        -Headers @{
                            Authorization = "Bearer $($login.accessToken)"
                        } `
                        -TimeoutSec 15

                    Add-Finding `
                        "Runtime" `
                        "Admin dashboard authorization" `
                        "COMPLETE" `
                        ($dashboard | ConvertTo-Json -Compress -Depth 10)
                }
                catch {
                    Add-Finding `
                        "Runtime" `
                        "Admin dashboard authorization" `
                        "FAILED" `
                        $_.Exception.Message `
                        "Inspect JwtAuthGuard, RolesGuard, role metadata and guard order."
                }
            }
            else {
                Add-Finding "Runtime" "Admin login" "FAILED" "Login response contains no accessToken." "Repair authentication response."
            }
        }
        catch {
            Add-Finding "Runtime" "Admin login" "FAILED" $_.Exception.Message "Verify the audit account and authentication service."
        }
    }
}

# ============================================================
# 13. DOCUMENTATION AND DELIVERY
# ============================================================

$readmeCandidates = @(
    (Join-Path $Root "README.md"),
    (Join-Path $ApiRoot "README.md"),
    (Join-Path $AndroidRoot "README.md")
)

$existingReadmes = @($readmeCandidates | Where-Object { Test-Path $_ })

if ($existingReadmes.Count -gt 0) {
    Add-Finding "Documentation" "README documentation" "PARTIAL" ($existingReadmes -join "; ") "Review documentation completeness and accuracy."
}
else {
    Add-Finding "Documentation" "README documentation" "MISSING" "No expected README file found." "Create setup, architecture and usage documentation."
}

$docsPath = Join-Path $Root "docs"

if (Test-Path $docsPath) {
    $docFiles = @(
        Get-ChildItem $docsPath -Recurse -File -ErrorAction SilentlyContinue
    )

    Add-Finding "Documentation" "Project docs directory" "INFO" "$($docFiles.Count) documentation file(s) found."
}
else {
    Add-Finding "Documentation" "Project docs directory" "MISSING" "docs directory not found." "Add technical and operational documentation."
}

# ============================================================
# 14. CONSERVATIVE STATUS SUMMARY
# ============================================================

$measurableFindings = @(
    $script:Findings |
    Where-Object {
        $_.Status -in @("COMPLETE", "PARTIAL", "MISSING", "FAILED", "UNKNOWN")
    }
)

$statusCounts = [ordered]@{
    COMPLETE = @($measurableFindings | Where-Object Status -eq "COMPLETE").Count
    PARTIAL  = @($measurableFindings | Where-Object Status -eq "PARTIAL").Count
    MISSING  = @($measurableFindings | Where-Object Status -eq "MISSING").Count
    FAILED   = @($measurableFindings | Where-Object Status -eq "FAILED").Count
    UNKNOWN  = @($measurableFindings | Where-Object Status -eq "UNKNOWN").Count
}

$verifiedTotal = $statusCounts.COMPLETE +
                 $statusCounts.PARTIAL +
                 $statusCounts.MISSING +
                 $statusCounts.FAILED

$verifiedCompletePercent = $null

if ($verifiedTotal -gt 0) {
    $verifiedCompletePercent = [math]::Round(
        100 * $statusCounts.COMPLETE / $verifiedTotal,
        1
    )
}

# This is deliberately called "verified check completion",
# not "project completion".
# Static existence and successful compilation do not prove full product completion.

$priorityRemaining = @(
    $script:Findings |
    Where-Object {
        $_.Status -in @("FAILED", "MISSING", "PARTIAL")
    } |
    Sort-Object @{
        Expression = {
            switch ($_.Status) {
                "FAILED"  { 1 }
                "MISSING" { 2 }
                "PARTIAL" { 3 }
                default   { 4 }
            }
        }
    }, Area, Item
)

# ============================================================
# 15. JSON REPORT
# ============================================================

$jsonReport = [ordered]@{
    report = [ordered]@{
        name              = "CPEB Project Audit"
        generatedAt       = (Get-Date).ToString("o")
        root              = $Root
        readOnlyAudit     = $true
        skipBuild         = [bool]$SkipBuild
        skipRuntimeTests  = [bool]$SkipRuntimeTests
    }

    interpretation = [ordered]@{
        warning = "Verified check completion is not the same as total product completion."
        completeMeans = "The specific check passed or the artifact was found."
        partialMeans = "Some evidence exists, but completion is not fully proven."
        missingMeans = "The expected artifact or feature was not found by this audit."
        failedMeans = "An executed build or runtime check failed."
        unknownMeans = "The check was skipped or could not be determined automatically."
    }

    summary = [ordered]@{
        counts = $statusCounts
        verifiedCheckCompletionPercent = $verifiedCompletePercent
    }

    findings = @($script:Findings)
    routeInventory = @($routeInventory)
    prismaModels = @($prismaModels)
    prismaEnums = @($prismaEnums)
    incompleteMarkers = @($markerHits)
    backendTestFiles = @(
        $backendTestFiles |
        ForEach-Object { $_.FullName.Replace($Root, "").TrimStart("\") }
    )
    androidTestFiles = @(
        $androidTestFiles |
        ForEach-Object { $_.FullName.Replace($Root, "").TrimStart("\") }
    )
    androidSourceFiles = @(
        $androidSourceFiles |
        ForEach-Object { $_.FullName.Replace($Root, "").TrimStart("\") }
    )
    commands = @($script:CommandEvidence)
}

$jsonText = $jsonReport | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText(
    $JsonPath,
    $jsonText,
    [System.Text.UTF8Encoding]::new($false)
)

[System.IO.File]::WriteAllText(
    $LatestJsonPath,
    $jsonText,
    [System.Text.UTF8Encoding]::new($false)
)

# ============================================================
# 16. MARKDOWN REPORT
# ============================================================

$md = [System.Text.StringBuilder]::new()

[void]$md.AppendLine("# CPEB Project Audit")
[void]$md.AppendLine("")
[void]$md.AppendLine("- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')")
[void]$md.AppendLine("- Root: ``$Root``")
[void]$md.AppendLine("- Audit mode: **Read-only**")
[void]$md.AppendLine("- Build skipped: **$([bool]$SkipBuild)**")
[void]$md.AppendLine("- Runtime tests skipped: **$([bool]$SkipRuntimeTests)**")
[void]$md.AppendLine("")
[void]$md.AppendLine("> **Important:** The percentage below describes only the checks that this script could verify. It is not an invented percentage for total product completion.")
[void]$md.AppendLine("")

[void]$md.AppendLine("## Executive Summary")
[void]$md.AppendLine("")
[void]$md.AppendLine("| Status | Count |")
[void]$md.AppendLine("|---|---:|")
[void]$md.AppendLine("| COMPLETE | $($statusCounts.COMPLETE) |")
[void]$md.AppendLine("| PARTIAL | $($statusCounts.PARTIAL) |")
[void]$md.AppendLine("| MISSING | $($statusCounts.MISSING) |")
[void]$md.AppendLine("| FAILED | $($statusCounts.FAILED) |")
[void]$md.AppendLine("| UNKNOWN | $($statusCounts.UNKNOWN) |")
[void]$md.AppendLine("")

if ($null -ne $verifiedCompletePercent) {
    [void]$md.AppendLine("- Verified-check completion: **$verifiedCompletePercent%**")
}
else {
    [void]$md.AppendLine("- Verified-check completion: **Not calculable**")
}

[void]$md.AppendLine("")
[void]$md.AppendLine("## What Is Verified as Complete")
[void]$md.AppendLine("")

$completeFindings = @(
    $script:Findings |
    Where-Object Status -eq "COMPLETE" |
    Sort-Object Area, Item
)

if ($completeFindings.Count -eq 0) {
    [void]$md.AppendLine("No items were verified as complete.")
}
else {
    [void]$md.AppendLine("| Area | Item | Evidence |")
    [void]$md.AppendLine("|---|---|---|")

    foreach ($finding in $completeFindings) {
        [void]$md.AppendLine(
            "| $(Convert-ToMarkdownCell $finding.Area) | $(Convert-ToMarkdownCell $finding.Item) | $(Convert-ToMarkdownCell $finding.Evidence) |"
        )
    }
}

[void]$md.AppendLine("")
[void]$md.AppendLine("## What Remains or Requires Verification")
[void]$md.AppendLine("")

if ($priorityRemaining.Count -eq 0) {
    [void]$md.AppendLine("No failed, missing or partial items were detected.")
}
else {
    [void]$md.AppendLine("| Priority | Area | Item | Status | Evidence | Required action |")
    [void]$md.AppendLine("|---:|---|---|---|---|---|")

    $priorityNumber = 1

    foreach ($finding in $priorityRemaining) {
        [void]$md.AppendLine(
            "| $priorityNumber | $(Convert-ToMarkdownCell $finding.Area) | $(Convert-ToMarkdownCell $finding.Item) | $($finding.Status) | $(Convert-ToMarkdownCell $finding.Evidence) | $(Convert-ToMarkdownCell $finding.Remaining) |"
        )

        $priorityNumber++
    }
}

[void]$md.AppendLine("")
[void]$md.AppendLine("## Complete Findings Table")
[void]$md.AppendLine("")
[void]$md.AppendLine("| Area | Item | Status | Evidence | Remaining |")
[void]$md.AppendLine("|---|---|---|---|---|")

foreach ($finding in ($script:Findings | Sort-Object Area, Item)) {
    [void]$md.AppendLine(
        "| $(Convert-ToMarkdownCell $finding.Area) | $(Convert-ToMarkdownCell $finding.Item) | $($finding.Status) | $(Convert-ToMarkdownCell $finding.Evidence) | $(Convert-ToMarkdownCell $finding.Remaining) |"
    )
}

[void]$md.AppendLine("")
[void]$md.AppendLine("## API Route Inventory")
[void]$md.AppendLine("")
[void]$md.AppendLine("| Method | Route | Controller | Roles | Guards |")
[void]$md.AppendLine("|---|---|---|---|---|")

foreach ($route in ($routeInventory | Sort-Object Route, Method)) {
    [void]$md.AppendLine(
        "| $($route.Method) | ``$($route.Route)`` | $($route.Controller) | $(Convert-ToMarkdownCell $route.Roles) | $(Convert-ToMarkdownCell $route.Guards) |"
    )
}

[void]$md.AppendLine("")
[void]$md.AppendLine("## Prisma Inventory")
[void]$md.AppendLine("")
[void]$md.AppendLine("- Models: $($prismaModels -join ', ')")
[void]$md.AppendLine("- Enums: $($prismaEnums -join ', ')")

[void]$md.AppendLine("")
[void]$md.AppendLine("## Incomplete or Suspicious Markers")
[void]$md.AppendLine("")

if ($markerHits.Count -eq 0) {
    [void]$md.AppendLine("No TODO/FIXME/not-implemented markers were detected.")
}
else {
    [void]$md.AppendLine("| File | Line | Text |")
    [void]$md.AppendLine("|---|---:|---|")

    foreach ($marker in $markerHits) {
        [void]$md.AppendLine(
            "| $(Convert-ToMarkdownCell $marker.File) | $($marker.LineNumber) | $(Convert-ToMarkdownCell $marker.Text) |"
        )
    }
}

[void]$md.AppendLine("")
[void]$md.AppendLine("## Command Evidence")
[void]$md.AppendLine("")

foreach ($command in $script:CommandEvidence) {
    [void]$md.AppendLine("### $($command.Name)")
    [void]$md.AppendLine("")
    [void]$md.AppendLine("- Success: **$($command.Succeeded)**")
    [void]$md.AppendLine("- Exit code: ``$($command.ExitCode)``")
    [void]$md.AppendLine("")
    [void]$md.AppendLine('```text')

    $commandOutput = @($command.Output)

    if ($commandOutput.Count -eq 0) {
        [void]$md.AppendLine("(no output)")
    }
    else {
        foreach ($line in $commandOutput) {
            [void]$md.AppendLine("$line")
        }
    }

    [void]$md.AppendLine('```')
    [void]$md.AppendLine("")
}

[void]$md.AppendLine("## Interpretation Rules")
[void]$md.AppendLine("")
[void]$md.AppendLine("- **COMPLETE:** This exact check passed. It does not automatically prove the entire surrounding feature.")
[void]$md.AppendLine("- **PARTIAL:** Evidence exists, but implementation or runtime behavior is not fully proven.")
[void]$md.AppendLine("- **MISSING:** The expected item was not found.")
[void]$md.AppendLine("- **FAILED:** A build or runtime test was executed and failed.")
[void]$md.AppendLine("- **UNKNOWN:** The audit could not determine the result or the test was skipped.")
[void]$md.AppendLine("")
[void]$md.AppendLine("The final project-completion percentage must be based on an agreed requirements matrix, not merely on file counts or successful builds.")

$markdownText = $md.ToString()

[System.IO.File]::WriteAllText(
    $MarkdownPath,
    $markdownText,
    [System.Text.UTF8Encoding]::new($false)
)

[System.IO.File]::WriteAllText(
    $LatestMdPath,
    $markdownText,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " AUDIT COMPLETED" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "COMPLETE : $($statusCounts.COMPLETE)" -ForegroundColor Green
Write-Host "PARTIAL  : $($statusCounts.PARTIAL)" -ForegroundColor Yellow
Write-Host "MISSING  : $($statusCounts.MISSING)" -ForegroundColor Magenta
Write-Host "FAILED   : $($statusCounts.FAILED)" -ForegroundColor Red
Write-Host "UNKNOWN  : $($statusCounts.UNKNOWN)" -ForegroundColor DarkGray

if ($null -ne $verifiedCompletePercent) {
    Write-Host ""
    Write-Host "Verified-check completion: $verifiedCompletePercent%" -ForegroundColor Cyan
    Write-Host "This is NOT the total product completion percentage." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Markdown report:"
Write-Host $MarkdownPath -ForegroundColor Cyan
Write-Host ""
Write-Host "JSON report:"
Write-Host $JsonPath -ForegroundColor Cyan
Write-Host ""
Write-Host "Latest report aliases:"
Write-Host $LatestMdPath
Write-Host $LatestJsonPath
Write-Host ""
