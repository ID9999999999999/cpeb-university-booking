# CPEB University Booking

[![CPEB CI-CD](https://github.com/ID9999999999999/cpeb-university-booking/actions/workflows/ci-cd.yml/badge.svg?branch=main&event=push)](https://github.com/ID9999999999999/cpeb-university-booking/actions/workflows/ci-cd.yml)

A complete university resource-booking system with an Android student client, a secure administration web portal, a NestJS REST API, and PostgreSQL persistence.

> **Android APK:** [Download the latest release](https://github.com/ID9999999999999/cpeb-university-booking/releases/latest)
>
> **Administration portal:** https://cpeb-university-booking-admin-web.onrender.com
>
> **Production API:** https://cpeb-university-booking-api-v4.onrender.com

## What the system does

Students and teachers can browse university resources, check availability, submit reservations, follow booking decisions, cancel eligible bookings, complete bookings, and report equipment problems.

Authorized staff can review pending bookings, approve or reject requests, manage equipment and maintenance, process repair tickets, manage users according to role, and review audit records.

### Booking workflow

```text
Student / Teacher
       |
       v
    PENDING
    /     \
   v       v
REJECTED  APPROVED
              |
              v
         CHECKED_OUT
              |
              v
           RETURNED
              |
              v
            CLOSED
```

The administration portal completes the approval loop: a request created by a student appears as `PENDING`, an authorized administrator or lab manager approves or rejects it, and the decision is returned to the student's **My Bookings** view.

## Applications

| Component | Technology | Purpose |
|---|---|---|
| Android | Kotlin, Jetpack Compose, Material 3 | Student and teacher booking client |
| Admin Web | Dependency-free browser UI + Node static server | Secure booking approval portal |
| API | NestJS, TypeScript | Authentication, booking, equipment and administration API |
| Database | PostgreSQL 16 + Prisma | Persistent university data |

## Repository structure

```text
apps/
├── admin-web/          Administration portal
├── android/            Android application
└── api/                NestJS backend

docs/                  Project and API documentation
evidence/              Test evidence and screenshots
scripts/               Utility and verification scripts
tests/                 Project verification resources
```

## Key features

### Authentication and authorization

- User registration and email verification
- bcrypt password hashing
- JWT authentication
- Persistent Android login session
- Database-backed roles
- `ADMIN`, `LAB_MANAGER`, `TECHNICIAN`, `TEACHER`, and `STUDENT` authorization
- Inactive-user rejection
- Production JWT-secret validation
- Administrator portal access restricted to authorized administrative roles
- Admin Web access token kept only in page memory and cleared on logout or refresh

### Equipment and resources

- Searchable and filterable university resource catalog
- Rooms, laboratories, media equipment, sports resources, and parking resources
- Inventory-tag uniqueness
- Equipment detail and availability
- Administrative creation and status management
- Modern category illustrations and CPEB visual identity
- Audit events for equipment changes

### Bookings

- Availability checks
- Time-interval validation
- Requests start in `PENDING`
- Collision prevention for active booking states
- Maintenance windows block conflicting bookings
- Student booking history
- Student cancellation and completion flows
- Administrative approve / reject
- Check-out / return / close lifecycle
- Invalid repeated transitions rejected
- Booking actions recorded in the audit log

### Administration portal

- Secure administrator and lab-manager sign-in
- Pending, active, and available-equipment summary cards
- Pending request table with requester, resource, period, reason, and actions
- Approve and reject actions connected to the production API
- Rejection reason support
- Responsive desktop/mobile styling
- Modern CPEB branding
- CSP, clickjacking protection, no-referrer policy, no-store caching, and restrictive browser permissions

### Maintenance and repair

- Maintenance listing and detail
- Role-protected maintenance operations
- Booking-conflict and overlapping-maintenance validation
- Controlled maintenance state transitions
- Automatic equipment maintenance status handling
- Student repair-ticket submission and history
- Technician assignment and diagnosis
- Audit trail for administrative actions

### API quality and privacy

- Swagger / OpenAPI at `/docs`
- Bearer authorization in Swagger
- Global DTO validation and transformation
- Health and database-health endpoints
- Configurable production CORS origins
- Security response headers
- Request IDs and structured HTTP logs
- Safe audit responses that do not expose credential material

## Continuous integration

Every pull request is validated through GitHub Actions.

The pipeline includes:

- Backend dependency security gate
- Prisma schema validation and client generation
- Clean PostgreSQL migration deployment
- Backend build
- Backend unit tests with coverage
- Deep PostgreSQL E2E tests
- Deployable backend container build
- Android unit and API-contract tests
- Android instrumentation-test compilation
- Android lint
- Android debug APK build
- Admin Web JavaScript syntax checks
- Admin Web security and API-contract tests

Changes are merged to `main` only after the full pipeline succeeds.

## Local backend setup

Requirements: Node.js 22+, PostgreSQL 16, and npm.

```powershell
cd apps\api
Copy-Item .env.example .env
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run seed:resources
npm run start:dev
```

Configure at least:

```text
DATABASE_URL
JWT_SECRET
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
MAIL_FROM
```

Administrative accounts are provisioned only from explicit environment variables. No public default administrator password is embedded in the active seed flow.

To provision administrative accounts in an authorized environment:

```powershell
npm run seed:admin
```

## Local endpoints

```text
API:      http://localhost:3000/
Health:   http://localhost:3000/health
Database: http://localhost:3000/db-health
Swagger:  http://localhost:3000/docs
```

## Android backend address

The emulator default is:

```text
http://10.0.2.2:3000/
```

For a physical device on the same network, provide the reachable backend URL:

```powershell
cd apps\android
.\gradlew.bat assembleDebug -PCPEB_API_BASE_URL=http://192.168.1.20:3000/
```

Replace the sample address with the backend computer's LAN address. The same value can be supplied through the `CPEB_API_BASE_URL` environment variable.

## Verification commands

Backend:

```powershell
cd apps\api
npm run verify
npm run test:e2e -- --runInBand
```

Android:

```powershell
cd apps\android
.\gradlew.bat testDebugUnitTest
.\gradlew.bat lintDebug
.\gradlew.bat assembleDebug
```

Admin Web:

```powershell
cd apps\admin-web
npm run ci
```

## Production deployment

The repository contains `render.yaml` for the production topology:

- API from `main`
- Admin Web from `main`
- PostgreSQL in Frankfurt
- exact Admin Web origin in production CORS configuration
- production-only security configuration

Secrets remain Render environment variables and are not committed to GitHub.

## Security scope

This is an academic university software project with real authentication, authorization, validation, protected administrative operations, auditing, CI security checks, and production deployment controls.

A long-lived institutional deployment should additionally use managed backups, formal secret rotation, monitoring and alerting, rate limiting, disaster recovery, penetration testing, and university operational policies.

## Academic information

**Supervisor:** Nazih Errahel  
**University:** Irkutsk National Research Technical University (INRTU)  
**Student:** Yasser Idbouzkri

## License

All rights reserved.
