# CPEB Project Audit

- Generated: 2026-07-16 15:35:21 +08:00
- Root: `C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES`
- Audit mode: **Read-only**
- Build skipped: **False**
- Runtime tests skipped: **False**

> **Important:** The percentage below describes only the checks that this script could verify. It is not an invented percentage for total product completion.

## Executive Summary

| Status | Count |
|---|---:|
| COMPLETE | 61 |
| PARTIAL | 4 |
| MISSING | 1 |
| FAILED | 0 |
| UNKNOWN | 0 |

- Verified-check completion: **92.4%**

## What Is Verified as Complete

| Area | Item | Evidence |
|---|---|---|
| Android | AndroidManifest.xml | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\android\app\src\main\AndroidManifest.xml |
| Android | Kotlin/Java source | 9 Kotlin/Java source file(s) found. |
| API Routes | Declared routes | 43 route declaration(s) found. |
| Artifacts | Android APK | 1 APK file(s). Latest: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\android\app\build\outputs\apk\debug\app-debug.apk |
| Artifacts | Backend compiled entry point | C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\dist\src\main.js |
| Authentication | JWT guard | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\src\auth\jwt-auth.guard.ts |
| Authentication | JWT strategy | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\src\auth\jwt.strategy.ts |
| Authorization | Admin guard order | JwtAuthGuard runs before RolesGuard. |
| Authorization | Admin role metadata | @Roles metadata exists on AdminController or its handlers. |
| Authorization | Global RolesGuard ordering risk | No global RolesGuard registration detected in auth.module.ts. |
| Authorization | Roles decorator | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\src\auth\roles.decorator.ts |
| Authorization | Roles guard | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\src\auth\roles.guard.ts |
| Backend Modules | AdminModule | Registered or imported in app.module.ts. |
| Backend Modules | AuditLogsModule | Registered or imported in app.module.ts. |
| Backend Modules | AuthModule | Registered or imported in app.module.ts. |
| Backend Modules | BookingsModule | Registered or imported in app.module.ts. |
| Backend Modules | EquipmentModule | Registered or imported in app.module.ts. |
| Backend Modules | MaintenanceModule | Registered or imported in app.module.ts. |
| Backend Modules | PrismaModule | Registered or imported in app.module.ts. |
| Backend Modules | RepairTicketsModule | Registered or imported in app.module.ts. |
| Backend Structure | Controllers | 8 controller file(s). |
| Backend Structure | Nest modules | 9 module file(s): app.module.ts, admin.module.ts, audit-logs.module.ts, auth.module.ts, bookings.module.ts, equipment.module.ts, maintenance.module.ts, prisma.module.ts, repair-tickets.module.ts |
| Backend Structure | Services | 9 service file(s). |
| Build | Android debug APK build | gradlew.bat assembleDebug exited with code 0. |
| Build | Backend build | npm run build exited with code 0. |
| Database Models | AuditLog | Model exists in schema.prisma. |
| Database Models | Booking | Model exists in schema.prisma. |
| Database Models | Equipment | Model exists in schema.prisma. |
| Database Models | RepairTicket | Model exists in schema.prisma. |
| Database Models | User | Model exists in schema.prisma. |
| Database Runtime | DATABASE_URL | DATABASE_URL="postgresql://postgres:***@localhost:5432/university_equipment_booking?schema=public" |
| Database Schema | Prisma migrations | 1 migration directory/directories found. |
| Expected API Routes | GET /admin/audit | Route declared. |
| Expected API Routes | GET /admin/bookings | Route declared. |
| Expected API Routes | GET /admin/dashboard | Route declared. |
| Expected API Routes | GET /admin/equipment | Route declared. |
| Expected API Routes | GET /admin/maintenance | Route declared. |
| Expected API Routes | GET /admin/reports | Route declared. |
| Expected API Routes | GET /admin/users | Route declared. |
| Expected API Routes | GET /auth/me | Route declared. |
| Expected API Routes | GET /bookings/availability | Route declared. |
| Expected API Routes | GET /bookings/mine | Route declared. |
| Expected API Routes | GET /equipment | Route declared. |
| Expected API Routes | POST /auth/login | Route declared. |
| Expected API Routes | POST /auth/register | Route declared. |
| Expected API Routes | POST /bookings | Route declared. |
| Git | Repository detected | Git root: C:/Users/YASSER/Desktop/CPEB_UNIFIED_PROJECT/CODES |
| Git | Tracked working tree | No tracked source changes. Untracked entries: 10. |
| Project Structure | Android application | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\android |
| Project Structure | Android Gradle wrapper | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\android\gradlew.bat |
| Project Structure | Backend application | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api |
| Project Structure | Backend package.json | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\package.json |
| Project Structure | Nest AppModule | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\src\app.module.ts |
| Project Structure | Prisma schema | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\prisma\schema.prisma |
| Runtime | Admin dashboard authorization | {"generatedAt":"2026-07-16T07:35:21.000Z","users":{"total":6,"active":6},"equipment":{"total":22,"available":18},"bookings":{"pending":4,"active":1},"reports":{"open":3},"maintenance":{"active":10}} |
| Runtime | Admin login | JWT access token returned for the audit admin account. |
| Runtime | API port 3000 | localhost:3000 accepts TCP connections. |
| Runtime | GET /db-health | {"status":"ok","database":"connected","provider":"postgresql","timestamp":"2026-07-16T07:35:20.033Z"} |
| Runtime | GET /health | {"status":"ok","service":"university-equipment-booking-api","timestamp":"2026-07-16T07:35:19.504Z"} |
| Runtime | PostgreSQL port 5432 | localhost:5432 accepts TCP connections. |
| Static Completeness | TODO/FIXME/not-implemented markers | No matching markers found in scanned TypeScript/Kotlin/Java source. |

## What Remains or Requires Verification

| Priority | Area | Item | Status | Evidence | Required action |
|---:|---|---|---|---|---|
| 1 | Database Models | Maintenance | MISSING | Model not found. | Add the model if required by project scope. |
| 2 | Android Integration | Backend API references | PARTIAL | 5 network/API reference(s) found. | Runtime verification is still required. |
| 3 | Documentation | README documentation | PARTIAL | C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\README.md; C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\README.md | Review documentation completeness and accuracy. |
| 4 | Testing | Android test files | PARTIAL | 2 Android test file(s) found. | Passing tests must still be verified. |
| 5 | Testing | Backend test files | PARTIAL | 3 test-related file(s) found. | Passing tests must still be verified. |

## Complete Findings Table

| Area | Item | Status | Evidence | Remaining |
|---|---|---|---|---|
| Android | AndroidManifest.xml | COMPLETE | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\android\app\src\main\AndroidManifest.xml |  |
| Android | Kotlin/Java source | COMPLETE | 9 Kotlin/Java source file(s) found. |  |
| Android | Screens/ViewModels inventory | INFO | 1 screen, fragment, activity or ViewModel file(s): MainActivity.kt |  |
| Android Integration | Backend API references | PARTIAL | 5 network/API reference(s) found. | Runtime verification is still required. |
| API Routes | Declared routes | COMPLETE | 43 route declaration(s) found. |  |
| Artifacts | Android APK | COMPLETE | 1 APK file(s). Latest: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\android\app\build\outputs\apk\debug\app-debug.apk |  |
| Artifacts | Backend compiled entry point | COMPLETE | C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\dist\src\main.js |  |
| Authentication | JWT guard | COMPLETE | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\src\auth\jwt-auth.guard.ts |  |
| Authentication | JWT strategy | COMPLETE | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\src\auth\jwt.strategy.ts |  |
| Authorization | Admin guard order | COMPLETE | JwtAuthGuard runs before RolesGuard. |  |
| Authorization | Admin role metadata | COMPLETE | @Roles metadata exists on AdminController or its handlers. |  |
| Authorization | Global RolesGuard ordering risk | COMPLETE | No global RolesGuard registration detected in auth.module.ts. |  |
| Authorization | Roles decorator | COMPLETE | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\src\auth\roles.decorator.ts |  |
| Authorization | Roles guard | COMPLETE | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\src\auth\roles.guard.ts |  |
| Backend Modules | AdminModule | COMPLETE | Registered or imported in app.module.ts. |  |
| Backend Modules | AuditLogsModule | COMPLETE | Registered or imported in app.module.ts. |  |
| Backend Modules | AuthModule | COMPLETE | Registered or imported in app.module.ts. |  |
| Backend Modules | BookingsModule | COMPLETE | Registered or imported in app.module.ts. |  |
| Backend Modules | EquipmentModule | COMPLETE | Registered or imported in app.module.ts. |  |
| Backend Modules | MaintenanceModule | COMPLETE | Registered or imported in app.module.ts. |  |
| Backend Modules | PrismaModule | COMPLETE | Registered or imported in app.module.ts. |  |
| Backend Modules | RepairTicketsModule | COMPLETE | Registered or imported in app.module.ts. |  |
| Backend Structure | Controllers | COMPLETE | 8 controller file(s). |  |
| Backend Structure | Nest modules | COMPLETE | 9 module file(s): app.module.ts, admin.module.ts, audit-logs.module.ts, auth.module.ts, bookings.module.ts, equipment.module.ts, maintenance.module.ts, prisma.module.ts, repair-tickets.module.ts |  |
| Backend Structure | Services | COMPLETE | 9 service file(s). |  |
| Build | Android debug APK build | COMPLETE | gradlew.bat assembleDebug exited with code 0. |  |
| Build | Backend build | COMPLETE | npm run build exited with code 0. |  |
| Database Models | AuditLog | COMPLETE | Model exists in schema.prisma. |  |
| Database Models | Booking | COMPLETE | Model exists in schema.prisma. |  |
| Database Models | Equipment | COMPLETE | Model exists in schema.prisma. |  |
| Database Models | Maintenance | MISSING | Model not found. | Add the model if required by project scope. |
| Database Models | RepairTicket | COMPLETE | Model exists in schema.prisma. |  |
| Database Models | User | COMPLETE | Model exists in schema.prisma. |  |
| Database Runtime | DATABASE_URL | COMPLETE | DATABASE_URL="postgresql://postgres:***@localhost:5432/university_equipment_booking?schema=public" |  |
| Database Schema | Prisma enums | INFO | 5 enum(s): UserRole, EquipmentStatus, BookingStatus, MaintenanceStatus, RepairTicketStatus |  |
| Database Schema | Prisma migrations | COMPLETE | 1 migration directory/directories found. |  |
| Database Schema | Prisma models | INFO | 6 model(s): User, Equipment, Booking, MaintenanceRecord, RepairTicket, AuditLog |  |
| Documentation | Project docs directory | INFO | 7 documentation file(s) found. |  |
| Documentation | README documentation | PARTIAL | C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\README.md; C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\README.md | Review documentation completeness and accuracy. |
| Expected API Routes | GET /admin/audit | COMPLETE | Route declared. |  |
| Expected API Routes | GET /admin/bookings | COMPLETE | Route declared. |  |
| Expected API Routes | GET /admin/dashboard | COMPLETE | Route declared. |  |
| Expected API Routes | GET /admin/equipment | COMPLETE | Route declared. |  |
| Expected API Routes | GET /admin/maintenance | COMPLETE | Route declared. |  |
| Expected API Routes | GET /admin/reports | COMPLETE | Route declared. |  |
| Expected API Routes | GET /admin/users | COMPLETE | Route declared. |  |
| Expected API Routes | GET /auth/me | COMPLETE | Route declared. |  |
| Expected API Routes | GET /bookings/availability | COMPLETE | Route declared. |  |
| Expected API Routes | GET /bookings/mine | COMPLETE | Route declared. |  |
| Expected API Routes | GET /equipment | COMPLETE | Route declared. |  |
| Expected API Routes | POST /auth/login | COMPLETE | Route declared. |  |
| Expected API Routes | POST /auth/register | COMPLETE | Route declared. |  |
| Expected API Routes | POST /bookings | COMPLETE | Route declared. |  |
| Git | Current branch | INFO | admin-operations-20260716_000021 |  |
| Git | Latest commit | INFO | 4524603c4dcb6fe4f387f3ef9da94642194daec5\|4524603\|Fix admin authorization guard order\|2026-07-16T14:18:43+08:00 |  |
| Git | Repository detected | COMPLETE | Git root: C:/Users/YASSER/Desktop/CPEB_UNIFIED_PROJECT/CODES |  |
| Git | Tracked working tree | COMPLETE | No tracked source changes. Untracked entries: 10. |  |
| Git | Untracked files | INFO | ?? CPEB_ADMIN_AND_OPERATIONS.ps1; ?? CPEB_ADMIN_FINAL_REPAIR.ps1; ?? CPEB_ENGINEERING_REPAIR_AND_VALIDATE.ps1; ?? CPEB_PROJECT_AUDIT.json; ?? CPEB_PROJECT_AUDIT.md; ?? CPEB_PROJECT_AUDIT.ps1; ?? backups/ADMIN_FINAL_REPAIR_20260716_012349/; ?? backups/ADMIN_FINAL_REPAIR_20260716_013042/; ?? backups/ADMIN_OPERATIONS_20260716_000021/; ?? evidence/project-audit/ |  |
| Project Structure | Android application | COMPLETE | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\android |  |
| Project Structure | Android Gradle wrapper | COMPLETE | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\android\gradlew.bat |  |
| Project Structure | Backend application | COMPLETE | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api |  |
| Project Structure | Backend package.json | COMPLETE | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\package.json |  |
| Project Structure | Nest AppModule | COMPLETE | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\src\app.module.ts |  |
| Project Structure | Prisma schema | COMPLETE | Exists: C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES\apps\api\prisma\schema.prisma |  |
| Runtime | Admin dashboard authorization | COMPLETE | {"generatedAt":"2026-07-16T07:35:21.000Z","users":{"total":6,"active":6},"equipment":{"total":22,"available":18},"bookings":{"pending":4,"active":1},"reports":{"open":3},"maintenance":{"active":10}} |  |
| Runtime | Admin login | COMPLETE | JWT access token returned for the audit admin account. |  |
| Runtime | API port 3000 | COMPLETE | localhost:3000 accepts TCP connections. |  |
| Runtime | GET /db-health | COMPLETE | {"status":"ok","database":"connected","provider":"postgresql","timestamp":"2026-07-16T07:35:20.033Z"} |  |
| Runtime | GET /health | COMPLETE | {"status":"ok","service":"university-equipment-booking-api","timestamp":"2026-07-16T07:35:19.504Z"} |  |
| Runtime | PostgreSQL port 5432 | COMPLETE | localhost:5432 accepts TCP connections. |  |
| Static Completeness | TODO/FIXME/not-implemented markers | COMPLETE | No matching markers found in scanned TypeScript/Kotlin/Java source. |  |
| Testing | Android test files | PARTIAL | 2 Android test file(s) found. | Passing tests must still be verified. |
| Testing | Backend test files | PARTIAL | 3 test-related file(s) found. | Passing tests must still be verified. |

## API Route Inventory

| Method | Route | Controller | Roles | Guards |
|---|---|---|---|---|
| GET | `/` | app.controller.ts |  |  |
| GET | `/admin/audit` | admin.controller.ts | UserRole.ADMIN | JwtAuthGuard, RolesGuard |
| GET | `/admin/bookings` | admin.controller.ts |  | JwtAuthGuard, RolesGuard |
| PATCH | `/admin/bookings/:id/approve` | admin.controller.ts | UserRole.ADMIN,UserRole.LAB_MANAGER | JwtAuthGuard, RolesGuard |
| PATCH | `/admin/bookings/:id/check-out` | admin.controller.ts | UserRole.ADMIN,UserRole.LAB_MANAGER | JwtAuthGuard, RolesGuard |
| PATCH | `/admin/bookings/:id/close` | admin.controller.ts |  | JwtAuthGuard, RolesGuard |
| PATCH | `/admin/bookings/:id/reject` | admin.controller.ts | UserRole.ADMIN,UserRole.LAB_MANAGER | JwtAuthGuard, RolesGuard |
| GET | `/admin/dashboard` | admin.controller.ts | UserRole.ADMIN,UserRole.LAB_MANAGER,UserRole.TECHNICIAN | JwtAuthGuard, RolesGuard |
| GET | `/admin/equipment` | admin.controller.ts |  | JwtAuthGuard, RolesGuard |
| POST | `/admin/equipment` | admin.controller.ts | UserRole.ADMIN,UserRole.LAB_MANAGER | JwtAuthGuard, RolesGuard |
| PATCH | `/admin/equipment/:id/status` | admin.controller.ts |  | JwtAuthGuard, RolesGuard |
| GET | `/admin/maintenance` | admin.controller.ts |  | JwtAuthGuard, RolesGuard |
| POST | `/admin/maintenance` | admin.controller.ts |  | JwtAuthGuard, RolesGuard |
| PATCH | `/admin/maintenance/:id/status` | admin.controller.ts |  | JwtAuthGuard, RolesGuard |
| GET | `/admin/reports` | admin.controller.ts |  | JwtAuthGuard, RolesGuard |
| PATCH | `/admin/reports/:id/assign` | admin.controller.ts | UserRole.ADMIN,UserRole.LAB_MANAGER | JwtAuthGuard, RolesGuard |
| PATCH | `/admin/reports/:id/status` | admin.controller.ts |  | JwtAuthGuard, RolesGuard |
| GET | `/admin/users` | admin.controller.ts | UserRole.ADMIN | JwtAuthGuard, RolesGuard |
| PATCH | `/admin/users/:id` | admin.controller.ts | UserRole.ADMIN | JwtAuthGuard, RolesGuard |
| GET | `/audit-logs` | audit-logs.controller.ts |  |  |
| GET | `/audit-logs/:id` | audit-logs.controller.ts |  |  |
| GET | `/audit-logs/booking/:bookingId` | audit-logs.controller.ts |  |  |
| GET | `/audit-logs/equipment/:equipmentId` | audit-logs.controller.ts |  |  |
| POST | `/auth/login` | auth.controller.ts |  |  |
| GET | `/auth/me` | auth.controller.ts |  | JwtAuthGuard |
| POST | `/auth/register` | auth.controller.ts |  |  |
| POST | `/bookings` | bookings.controller.ts |  | AuthGuard('jwt' |
| PATCH | `/bookings/:id/cancel` | bookings.controller.ts |  | AuthGuard('jwt' |
| PATCH | `/bookings/:id/finish` | bookings.controller.ts |  | AuthGuard('jwt' |
| GET | `/bookings/availability` | bookings.controller.ts |  | AuthGuard('jwt' |
| GET | `/bookings/mine` | bookings.controller.ts |  | AuthGuard('jwt' |
| GET | `/db-health` | app.controller.ts |  |  |
| GET | `/equipment` | equipment.controller.ts |  | AuthGuard('jwt' |
| POST | `/equipment` | equipment.controller.ts | 'ADMIN' | AuthGuard('jwt' |
| GET | `/equipment/:id` | equipment.controller.ts |  | AuthGuard('jwt' |
| PATCH | `/equipment/:id/status` | equipment.controller.ts | 'ADMIN' | AuthGuard('jwt' |
| GET | `/health` | app.controller.ts |  |  |
| GET | `/maintenance` | maintenance.controller.ts |  |  |
| POST | `/maintenance` | maintenance.controller.ts |  |  |
| GET | `/maintenance/:id` | maintenance.controller.ts |  |  |
| PATCH | `/maintenance/:id/status` | maintenance.controller.ts |  |  |
| POST | `/repair-tickets` | repair-tickets.controller.ts |  | AuthGuard('jwt' |
| GET | `/repair-tickets/mine` | repair-tickets.controller.ts |  | AuthGuard('jwt' |

## Prisma Inventory

- Models: User, Equipment, Booking, MaintenanceRecord, RepairTicket, AuditLog
- Enums: UserRole, EquipmentStatus, BookingStatus, MaintenanceStatus, RepairTicketStatus

## Incomplete or Suspicious Markers

No TODO/FIXME/not-implemented markers were detected.

## Command Evidence

### Git repository root

- Success: **True**
- Exit code: `0`

```text
C:/Users/YASSER/Desktop/CPEB_UNIFIED_PROJECT/CODES
```

### Current Git branch

- Success: **True**
- Exit code: `0`

```text
admin-operations-20260716_000021
```

### Current commit

- Success: **True**
- Exit code: `0`

```text
4524603c4dcb6fe4f387f3ef9da94642194daec5|4524603|Fix admin authorization guard order|2026-07-16T14:18:43+08:00
```

### Git working tree

- Success: **True**
- Exit code: `0`

```text
?? CPEB_ADMIN_AND_OPERATIONS.ps1
?? CPEB_ADMIN_FINAL_REPAIR.ps1
?? CPEB_ENGINEERING_REPAIR_AND_VALIDATE.ps1
?? CPEB_PROJECT_AUDIT.json
?? CPEB_PROJECT_AUDIT.md
?? CPEB_PROJECT_AUDIT.ps1
?? backups/ADMIN_FINAL_REPAIR_20260716_012349/
?? backups/ADMIN_FINAL_REPAIR_20260716_013042/
?? backups/ADMIN_OPERATIONS_20260716_000021/
?? evidence/project-audit/
```

### Backend build

- Success: **True**
- Exit code: `0`

```text

> api@0.0.1 build
> nest build

```

### Android assembleDebug

- Success: **True**
- Exit code: `0`

```text
Reusing configuration cache.
> Task :app:preBuild UP-TO-DATE
> Task :app:preDebugBuild UP-TO-DATE
> Task :app:mergeDebugNativeDebugMetadata NO-SOURCE
> Task :app:generateDebugResources UP-TO-DATE
> Task :app:generateDebugAssets UP-TO-DATE
> Task :app:javaPreCompileDebug UP-TO-DATE
> Task :app:generateDebugGlobalSynthetics UP-TO-DATE
> Task :app:packageDebugResources UP-TO-DATE
> Task :app:desugarDebugFileDependencies UP-TO-DATE
> Task :app:checkDebugDuplicateClasses UP-TO-DATE
> Task :app:mergeDebugAssets UP-TO-DATE
> Task :app:checkDebugAarMetadata UP-TO-DATE
> Task :app:mergeExtDexDebug UP-TO-DATE
> Task :app:processDebugNavigationResources UP-TO-DATE
> Task :app:mergeLibDexDebug UP-TO-DATE
> Task :app:mapDebugSourceSetPaths UP-TO-DATE
> Task :app:parseDebugLocalResources UP-TO-DATE
> Task :app:compressDebugAssets UP-TO-DATE
> Task :app:compileDebugNavigationResources UP-TO-DATE
> Task :app:generateDebugRFile UP-TO-DATE
> Task :app:createDebugCompatibleScreenManifests UP-TO-DATE
> Task :app:extractDeepLinksDebug UP-TO-DATE
> Task :app:mergeDebugJniLibFolders UP-TO-DATE
> Task :app:mergeDebugResources UP-TO-DATE
> Task :app:validateSigningDebug UP-TO-DATE
> Task :app:mergeDebugNativeLibs UP-TO-DATE
> Task :app:writeDebugAppMetadata UP-TO-DATE
> Task :app:writeDebugSigningConfigVersions UP-TO-DATE
> Task :app:stripDebugDebugSymbols UP-TO-DATE
> Task :app:processDebugMainManifest UP-TO-DATE
> Task :app:processDebugManifest UP-TO-DATE
> Task :app:processDebugManifestForPackage UP-TO-DATE
> Task :app:compileDebugKotlin UP-TO-DATE
> Task :app:compileDebugJavaWithJavac NO-SOURCE
> Task :app:processDebugJavaRes UP-TO-DATE
> Task :app:processDebugResources UP-TO-DATE
> Task :app:mergeDebugJavaResource UP-TO-DATE
> Task :app:dexBuilderDebug UP-TO-DATE
> Task :app:mergeProjectDexDebug UP-TO-DATE
> Task :app:packageDebug UP-TO-DATE
> Task :app:assembleDebug UP-TO-DATE
> Task :app:createDebugApkListingFileRedirect UP-TO-DATE

BUILD SUCCESSFUL in 2s
36 actionable tasks: 36 up-to-date
Configuration cache entry reused.
```

## Interpretation Rules

- **COMPLETE:** This exact check passed. It does not automatically prove the entire surrounding feature.
- **PARTIAL:** Evidence exists, but implementation or runtime behavior is not fully proven.
- **MISSING:** The expected item was not found.
- **FAILED:** A build or runtime test was executed and failed.
- **UNKNOWN:** The audit could not determine the result or the test was skipped.

The final project-completion percentage must be based on an agreed requirements matrix, not merely on file counts or successful builds.
