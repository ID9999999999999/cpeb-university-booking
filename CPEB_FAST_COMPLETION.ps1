param(
    [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Require-File([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required file not found: $Path"
    }
}

function Replace-Once {
    param(
        [string]$Text,
        [string]$Old,
        [string]$New,
        [string]$Label
    )

    $count = ([regex]::Matches($Text, [regex]::Escape($Old))).Count
    if ($count -eq 0) {
        Write-Host "SKIP: $Label (already changed or source differs)" -ForegroundColor Yellow
        return $Text
    }
    if ($count -gt 1) {
        throw "Unsafe replacement for '$Label': found $count matches."
    }

    Write-Host "PATCH: $Label" -ForegroundColor Green
    return $Text.Replace($Old, $New)
}

$rootCandidates = @(
    $ProjectRoot,
    (Join-Path $ProjectRoot ".."),
    (Join-Path $ProjectRoot "..\..")
)

$root = $null
foreach ($candidate in $rootCandidates) {
    $resolved = [System.IO.Path]::GetFullPath($candidate)
    if ((Test-Path (Join-Path $resolved "apps\android")) -and (Test-Path (Join-Path $resolved "apps\api"))) {
        $root = $resolved
        break
    }
}

if (-not $root) {
    throw "Run this script from the CODES folder (or apps\android)."
}

$androidRoot = Join-Path $root "apps\android"
$apiRoot = Join-Path $root "apps\api"
$appFile = Join-Path $androidRoot "app\src\main\java\com\yasser\ub\ubpremium\UbCampusBookingApp.kt"
$manifestFile = Join-Path $androidRoot "app\src\main\AndroidManifest.xml"
$gradleFile = Join-Path $androidRoot "app\build.gradle.kts"
$logFile = Join-Path $root "CPEB_FAST_COMPLETION.log"

Require-File $appFile
Require-File $manifestFile
Require-File $gradleFile
Require-File (Join-Path $apiRoot "package.json")
Require-File (Join-Path $androidRoot "gradlew.bat")

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $root "backups\fast_completion_$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Write-Step "Creating backups"
Copy-Item $appFile (Join-Path $backupDir "UbCampusBookingApp.kt")
Copy-Item $manifestFile (Join-Path $backupDir "AndroidManifest.xml")
Copy-Item $gradleFile (Join-Path $backupDir "build.gradle.kts")

Start-Transcript -Path $logFile -Append | Out-Null

try {
    Write-Step "Patching Android manifest"
    $manifest = Get-Content -LiteralPath $manifestFile -Raw
    if ($manifest -notmatch 'android\.permission\.INTERNET') {
        $manifest = $manifest.Replace(
            '    xmlns:tools="http://schemas.android.com/tools">',
            '    xmlns:tools="http://schemas.android.com/tools">' + "`r`n`r`n" +
            '    <uses-permission android:name="android.permission.INTERNET" />'
        )
    }
    Set-Content -LiteralPath $manifestFile -Value $manifest -Encoding UTF8

    Write-Step "Patching core application behavior"
    $text = Get-Content -LiteralPath $appFile -Raw

    $anchor = @'
        fun openResource(resource: ResourceUi) {
            selectedResource = resource
            screen = StudentScreen.ResourceDetails
        }
'@
    $helper = @'
        fun openResource(resource: ResourceUi) {
            selectedResource = resource
            screen = StudentScreen.ResourceDetails
        }

        fun updateSelectedBookingStatus(newStatus: String) {
            val index = bookings.indexOfFirst { it.id == selectedBooking.id }
            val updated = selectedBooking.copy(status = newStatus)
            selectedBooking = updated
            if (index >= 0) {
                bookings[index] = updated
            }
        }
'@
    if ($text -notmatch 'fun updateSelectedBookingStatus') {
        $text = Replace-Once $text $anchor $helper "booking status state helper"
    }

    $text = Replace-Once $text '                                        "Pending",' '                                        "Approved",' "new booking demo status"

    $oldFinish = @'
                        StudentScreen.FinishBooking -> StudentFinishBookingScreen(
                            onBack = { screen = StudentScreen.BookingTracking },
                            onRate = { screen = StudentScreen.RateExperience },
                            onProblem = { screen = StudentScreen.ReportProblem }
                        )
'@
    $newFinish = @'
                        StudentScreen.FinishBooking -> StudentFinishBookingScreen(
                            onBack = { screen = StudentScreen.BookingTracking },
                            onRate = {
                                updateSelectedBookingStatus("Finished")
                                screen = StudentScreen.RateExperience
                            },
                            onProblem = { screen = StudentScreen.ReportProblem }
                        )
'@
    $text = Replace-Once $text $oldFinish $newFinish "Finish updates booking status"

    $oldRating = @'
                        StudentScreen.RateExperience -> StudentRateExperienceScreen(
                            onBack = { screen = StudentScreen.FinishBooking },
                            onDone = { screen = StudentScreen.MyBookings }
                        )
'@
    $newRating = @'
                        StudentScreen.RateExperience -> StudentRateExperienceScreen(
                            onBack = { screen = StudentScreen.FinishBooking },
                            onDone = {
                                updateSelectedBookingStatus("Finished")
                                tab = "Bookings"
                                screen = StudentScreen.MyBookings
                            }
                        )
'@
    $text = Replace-Once $text $oldRating $newRating "rating completion flow"

    if ($text -notmatch '"Interactive Smart Board"') {
        $insertBefore = @'
        ResourceUi("park-visitor", ResourceKind.Parking, "Visitor Access Pass", "Guest parking with approval", "Security Office", "Approval required", IMG_PARKING, UB.Navy,
            listOf("Visitor name required", "Visit purpose required", "Security approval", "Limited duration"),
            listOf("Guest must carry ID", "Host is responsible for visitor")
        )
'@
        $expanded = @'
        ResourceUi("park-visitor", ResourceKind.Parking, "Visitor Access Pass", "Guest parking with approval", "Security Office", "Approval required", IMG_PARKING, UB.Navy,
            listOf("Visitor name required", "Visit purpose required", "Security approval", "Limited duration"),
            listOf("Guest must carry ID", "Host is responsible for visitor")
        ),
        ResourceUi("room-c3", ResourceKind.Rooms, "Conference Room C3", "Hybrid meeting room with video conferencing", "Administration Building", "Available today", IMG_ROOM, UB.Blue,
            listOf("24 seats", "Video conference system", "Interactive Smart Board", "Air conditioned"),
            listOf("Book at least one hour", "Return furniture to original layout")
        ),
        ResourceUi("room-study", ResourceKind.Rooms, "Graduate Study Room", "Quiet group study and supervision room", "Library - Floor 2", "Available now", IMG_ROOM, UB.Blue,
            listOf("16 seats", "Whiteboard", "Power outlets", "Library Wi-Fi"),
            listOf("Keep noise low", "Food is not allowed")
        ),
        ResourceUi("lab-ai", ResourceKind.Labs, "Artificial Intelligence Lab", "GPU workstations for AI practical work", "Tech Building - Floor 3", "Approval required", IMG_LAB, UB.Purple,
            listOf("20 GPU workstations", "Linux and ML software", "High-speed network", "Instructor console"),
            listOf("University account required", "Do not install unapproved software")
        ),
        ResourceUi("lab-electronics", ResourceKind.Labs, "Electronics Laboratory", "Measurement and prototyping laboratory", "Engineering Block", "Available tomorrow", IMG_LAB, UB.Purple,
            listOf("Oscilloscopes", "Power supplies", "Soldering stations", "Component kits"),
            listOf("Safety briefing required", "Return all components")
        ),
        ResourceUi("media-projector", ResourceKind.Media, "Portable Projector Kit", "Projector, HDMI adapters and carrying case", "Media Office", "Available now", IMG_MEDIA, UB.Orange,
            listOf("Full HD projector", "HDMI and USB-C adapters", "Remote control", "Carrying case"),
            listOf("Allow projector to cool", "Return every adapter")
        ),
        ResourceUi("media-light", ResourceKind.Media, "Studio Lighting Kit", "LED lights, stands and softboxes", "Media Studio", "Available today", IMG_MEDIA, UB.Orange,
            listOf("Three LED panels", "Adjustable stands", "Softboxes", "Power cables"),
            listOf("Fold stands carefully", "Switch off before packing")
        ),
        ResourceUi("sport-basket", ResourceKind.Sports, "Basketball Team Kit", "Balls, bibs and scoreboard controller", "Sports Center", "Available today", null, UB.Green,
            listOf("4 basketballs", "Two team bib sets", "Portable scoreboard control", "Indoor court use"),
            listOf("Return all balls", "Use only in sports facilities")
        ),
        ResourceUi("sport-event", ResourceKind.Sports, "Campus Event Equipment", "Cones, barriers, megaphone and timing tools", "Sports Storage", "Approval required", null, UB.Green,
            listOf("Safety cones", "Portable barriers", "Megaphone", "Stopwatches"),
            listOf("Staff approval required", "Count equipment at return")
        ),
        ResourceUi("park-event", ResourceKind.Parking, "Event Parking Zone", "Temporary parking allocation for campus events", "South Gate", "Limited availability", IMG_PARKING, UB.Navy,
            listOf("Event code required", "Timed access", "Security-controlled entry", "Group allocation"),
            listOf("Use assigned zone only", "Display event pass")
        )
'@
        $text = Replace-Once $text $insertBefore $expanded "expanded resource catalogue"
    }

    if ($text -notmatch 'ProfileAction\("Log out"') {
        throw "Logout action is missing."
    }

    Set-Content -LiteralPath $appFile -Value $text -Encoding UTF8

    Write-Step "Ensuring Android SDK"
    $sdkPath = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (-not (Test-Path $sdkPath)) { throw "Android SDK not found at $sdkPath" }
    Set-Content -LiteralPath (Join-Path $androidRoot "local.properties") -Value ("sdk.dir=" + $sdkPath.Replace("\", "\\")) -Encoding ASCII

    Write-Step "Building Backend"
    Push-Location $apiRoot
    try {
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw "Backend build failed." }
    } finally { Pop-Location }

    Write-Step "Building Android APK"
    Push-Location $androidRoot
    try {
        & .\gradlew.bat assembleDebug
        if ($LASTEXITCODE -ne 0) { throw "Android build failed." }
    } finally { Pop-Location }

    $apk = Join-Path $androidRoot "app\build\outputs\apk\debug\app-debug.apk"
    Require-File $apk

    Write-Step "SUCCESS"
    Write-Host "APK ready: $apk" -ForegroundColor Green
    Write-Host "Backup: $backupDir" -ForegroundColor Green
    Write-Host "Log: $logFile" -ForegroundColor Green
}
catch {
    Write-Host "`nFAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Restore from: $backupDir" -ForegroundColor Yellow
    throw
}
finally {
    Stop-Transcript | Out-Null
}
