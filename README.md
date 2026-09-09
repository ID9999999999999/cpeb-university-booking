> ## Android APK
> **[Download the latest Android APK](https://github.com/ID9999999999999/cpeb-university-booking/releases/latest)**
>
> GitHub automatically builds and publishes the installable APK from the main branch.

---
# CPEB University Booking System

[![CPEB CI-CD](https://github.com/ID9999999999999/cpeb-university-booking/actions/workflows/ci-cd.yml/badge.svg?branch=main&event=push)](https://github.com/ID9999999999999/cpeb-university-booking/actions/workflows/ci-cd.yml)

CPEB is a university equipment and resource booking system built with **NestJS**, **Prisma**, **PostgreSQL**, and **Android Jetpack Compose**.

The repository contains a real Android client and a real REST backend. Students can register, verify email addresses, authenticate, browse university resources, check availability, submit booking requests, manage their bookings, and report equipment problems. Authorized university staff can manage bookings, maintenance, equipment, repair tickets, users, and audit records.

## Architecture

```text
Android application
      â†“ Retrofit / JSON / JWT
NestJS REST API
      â†“ Prisma
PostgreSQL database
```

## Implemented Features

### Authentication and users

- âœ… User registration stored in PostgreSQL
- âœ… Email verification with six-digit codes
- âœ… Verification-code resend
- âœ… bcrypt password hashing
- âœ… JWT authentication
- âœ… Persistent Android login session
- âœ… Authenticated `/auth/me` profile endpoint
- âœ… Database-backed user roles
- âœ… Administrative role management
- âœ… Inactive-user rejection
- âœ… Production startup rejects a missing or short JWT secret

### Equipment

- âœ… Equipment listing and detail
- âœ… Inventory-tag uniqueness
- âœ… Equipment creation and status management
- âœ… Administrative equipment filtering
- âœ… Audit events for equipment creation and status changes
- âœ… General users do not receive nested operational booking/repair data from equipment detail

### Bookings

- âœ… Availability checks
- âœ… Time-interval validation
- âœ… Booking requests start in `PENDING`
- âœ… Overlapping `PENDING`, `APPROVED`, and `CHECKED_OUT` bookings are rejected
- âœ… Adjacent non-overlapping bookings are allowed
- âœ… Scheduled/active maintenance blocks conflicting bookings
- âœ… Student booking history
- âœ… Student cancellation of pending/approved bookings
- âœ… Student completion flow
- âœ… Administrative approval and rejection
- âœ… Administrative check-out, return, and close workflow
- âœ… Invalid or repeated state transitions are rejected
- âœ… Booking actions are recorded in audit logs

### Maintenance

- âœ… Maintenance listing and detail
- âœ… Role-protected maintenance operations
- âœ… Maintenance interval validation
- âœ… Booking-conflict validation
- âœ… Overlapping maintenance-window validation
- âœ… Controlled maintenance state transitions
- âœ… Equipment becomes `UNDER_MAINTENANCE` when maintenance becomes active
- âœ… Equipment is restored after maintenance when no other active maintenance remains
- âœ… Maintenance actions are recorded in audit logs

### Repair tickets

- âœ… Student repair-ticket submission
- âœ… Student repair-ticket history
- âœ… Student access to their own ticket detail
- âœ… Equipment validation
- âœ… Optional HTTP/HTTPS evidence URL
- âœ… Technician assignment
- âœ… Technician-role validation
- âœ… Diagnosis and status administration
- âœ… Closed tickets cannot be silently reopened
- âœ… Ticket creation and administrative actions are auditable

### Audit and privacy

- âœ… Audit-log module
- âœ… Audit filters by equipment and booking
- âœ… Direct audit-log routes restricted to administrators
- âœ… Audit responses expose safe actor fields instead of password hashes or verification secrets
- âœ… Request IDs and structured HTTP logs
- âœ… Consistent global HTTP error responses

### API quality

- âœ… Swagger / OpenAPI at `/docs`
- âœ… Bearer-token authorization in Swagger
- âœ… Global DTO validation and transformation
- âœ… Postman collection and local Postman environment
- âœ… Health and database-health endpoints
- âœ… Basic security headers
- âœ… Development CORS support and configurable production origins

### Android application

- âœ… Kotlin
- âœ… Jetpack Compose
- âœ… Material 3
- âœ… Retrofit and Gson
- âœ… Real backend authentication
- âœ… Registration and email-verification screens
- âœ… Dashboard
- âœ… Searchable/filterable resource list
- âœ… Equipment detail
- âœ… Availability checks
- âœ… Real booking submission
- âœ… Booking history, cancellation, and completion
- âœ… Repair reporting and history
- âœ… Profile/logout
- âœ… Loading and API error feedback
- âœ… Configurable backend URL at build time

### Testing and CI

- âœ… Backend unit tests
- âœ… Booking lifecycle tests
- âœ… Maintenance lifecycle tests
- âœ… Repair-ticket audit/ownership tests
- âœ… Administrative booking-transition tests
- âœ… Backend E2E health/security checks
- âœ… Backend build in GitHub Actions
- âœ… PostgreSQL service in CI
- âœ… Prisma schema validation, generation, and migration deployment in CI
- âœ… Runtime dependency gate for critical vulnerabilities
- âœ… Coverage report artifact in CI
- âœ… Android unit tests in CI
- âœ… Android debug APK build and artifact upload

## Technical Stack

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Authentication | JWT + Passport + bcrypt |
| Email verification | Nodemailer + SMTP |
| Validation | class-validator + class-transformer |
| API documentation | Swagger / OpenAPI + Postman |
| Mobile application | Android + Kotlin + Jetpack Compose + Material 3 |
| API client | Retrofit + Gson |
| CI | GitHub Actions |

## Repository Structure

```text
apps/
â”œâ”€â”€ api/                 NestJS backend
â””â”€â”€ android/             Android application

docs/                    Project and API documentation
evidence/                Test evidence and screenshots
scripts/                 Utility and verification scripts
tests/                   Project verification resources
```

## Quick Start â€” Backend

### 1. Start PostgreSQL

Use an existing PostgreSQL 16 installation, or optionally start the included local Docker database from the repository root:

```powershell
docker compose up -d postgres
```

The Docker development database listens on `localhost:5432`.

### 2. Configure the API

```powershell
cd apps\api
Copy-Item .env.example .env
```

Edit `.env` and set at least:

```text
DATABASE_URL
JWT_SECRET
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
MAIL_FROM
```

Real registration requires working SMTP configuration because the verification code is delivered by email.

### 3. Install and initialize

```powershell
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run seed:resources
```

To create administrative/technician seed accounts, configure the four `CPEB_*` credential variables in `.env`, then run:

```powershell
npm run seed:admin
```

No public default administrator password is embedded in the seed script.

### 4. Run

```powershell
npm run start:dev
```

Then open:

```text
API:     http://localhost:3000/
Health:  http://localhost:3000/health
DB:      http://localhost:3000/db-health
Swagger: http://localhost:3000/docs
```

## Android Backend Address

The Android application no longer contains a developer-specific LAN IP.

For the Android emulator, the default is:

```text
http://10.0.2.2:3000/
```

For a physical Android phone connected to the same network as the backend computer, build using the computer's reachable LAN address:

```powershell
cd apps\android
.\gradlew.bat assembleDebug -PCPEB_API_BASE_URL=http://192.168.1.20:3000/
```

Replace `192.168.1.20` with the backend computer's current LAN address. The property may also be supplied through the `CPEB_API_BASE_URL` environment variable.

The debug APK is produced under:

```text
apps/android/app/build/outputs/apk/debug/
```

## Booking Lifecycle

```text
Student submits request
        â†“
     PENDING
      â†™   â†˜
REJECTED   APPROVED
              â†“
         CHECKED_OUT
              â†“
           RETURNED
              â†“
            CLOSED
```

A reservation that does not require a physical check-out can be closed from `APPROVED`. A checked-out resource is returned before the administrative close step.

## Postman

Import:

```text
docs/api/CPEB_University_Booking_API.postman_collection.json
docs/api/CPEB_Local.postman_environment.json
```

The login request stores the returned bearer token in the collection variable automatically.

## Verification

Backend unit tests and build:

```powershell
cd apps\api
npm run verify
```

Backend E2E tests require a configured/running PostgreSQL database:

```powershell
npm run test:e2e -- --runInBand
```

Android:

```powershell
cd apps\android
.\gradlew.bat testDebugUnitTest
.\gradlew.bat assembleDebug
```

GitHub Actions repeats backend and Android verification on pull requests and pushes to `main`.

## Security Scope

This is an academic software project, not a fully operated university production service. It includes real authentication, authorization, request validation, protected administrative routes, safer audit responses, structured request logs, secret validation, and CI security checks. Production deployment would still require infrastructure-level TLS, secret management, persistent monitoring, backups, rate limiting, formal penetration testing, and operational policies.

## Academic Information

**Supervisor**  
Nazih Errahel

**University**  
Irkutsk National Research Technical University (INRTU)

**Student**  
Yasser Idbouzkri

## License

All rights reserved.

