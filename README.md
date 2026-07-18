# CPEB University Booking System

A university equipment and resource booking system built with **NestJS**, **Prisma**, **PostgreSQL**, and **Android Jetpack Compose**.

The project provides an academic booking workflow for students and university staff, including authentication, equipment management, booking validation, maintenance management, repair tickets, administrative operations, and audit tracking.

## Implemented Features

### Project Foundation

- ✅ Project scope and problem definition
- ✅ Core business rule: no overlapping active bookings for the same equipment
- ✅ Public GitHub repository
- ✅ Clean monorepository structure
- ✅ Backend and Android applications stored in one repository
- ✅ Environment example file
- ✅ Sensitive local files excluded from Git

### Backend — NestJS

- ✅ NestJS REST API
- ✅ PostgreSQL connection
- ✅ Prisma ORM integration
- ✅ Health endpoint
- ✅ Database health endpoint
- ✅ Authentication module
- ✅ Equipment module
- ✅ Booking module
- ✅ Administrative module
- ✅ Maintenance module
- ✅ Repair-ticket module
- ✅ Audit-log module

### Authentication and User Management

- ✅ Real user registration
- ✅ Email-verification workflow
- ✅ Verification-code resend endpoint
- ✅ Real user login
- ✅ Password hashing with bcrypt
- ✅ JWT authentication
- ✅ Authenticated user-profile endpoint
- ✅ User roles stored in the database
- ✅ Role-based administrative access
- ✅ Administrative user and role management

### Database — Prisma and PostgreSQL

- ✅ User model
- ✅ Equipment model
- ✅ Booking model
- ✅ MaintenanceRecord model
- ✅ RepairTicket model
- ✅ AuditLog model
- ✅ Core enums
- ✅ User-role enum
- ✅ Initial migration
- ✅ Seed data
- ✅ Demo users
- ✅ Administrative user
- ✅ Demo equipment

### Equipment Management

- ✅ List equipment
- ✅ Get one equipment item
- ✅ Create equipment
- ✅ Reject duplicate inventory tags
- ✅ Update equipment status
- ✅ Filter administrative equipment data
- ✅ Record equipment-status changes in audit logs

### Booking System

- ✅ Create booking requests
- ✅ Validate booking time intervals
- ✅ Check equipment availability
- ✅ Reject unknown equipment
- ✅ Reject unknown or inactive users
- ✅ Reject non-bookable equipment
- ✅ Reject overlapping bookings
- ✅ Allow adjacent bookings
- ✅ Display the authenticated user's booking history
- ✅ Cancel bookings
- ✅ Finish bookings
- ✅ Approve pending bookings
- ✅ Reject pending bookings
- ✅ Administrative check-out and closing operations
- ✅ Prevent repeated approval or rejection
- ✅ Restrict administrative booking actions by role
- ✅ Record booking actions in audit logs

### Maintenance

- ✅ List maintenance records
- ✅ Get one maintenance record
- ✅ Create maintenance records
- ✅ Validate maintenance intervals
- ✅ Validate maintenance status
- ✅ Update maintenance status
- ✅ Block bookings that overlap active or scheduled maintenance
- ✅ Allow bookings after maintenance ends
- ✅ Record maintenance actions in audit logs

### Repair Tickets

- ✅ List repair tickets
- ✅ Get one repair ticket
- ✅ Create repair tickets
- ✅ Display the authenticated user's reports
- ✅ Validate related equipment
- ✅ Validate ticket titles
- ✅ Assign technicians
- ✅ Validate technician roles
- ✅ Update repair-ticket status
- ✅ Store diagnoses
- ✅ Store evidence URLs
- ✅ Record repair-ticket actions in audit logs

### Audit Logs

- ✅ List audit logs
- ✅ Get one audit log
- ✅ Filter logs by equipment
- ✅ Filter logs by booking
- ✅ Return related actor and resource data
- ✅ Administrative audit access

### Android Application

- ✅ Android project
- ✅ Kotlin
- ✅ Jetpack Compose
- ✅ Material 3
- ✅ Real connection to the NestJS API
- ✅ Retrofit API client
- ✅ Registration screen and backend registration
- ✅ Email-verification screen
- ✅ Login screen and backend authentication
- ✅ JWT token storage
- ✅ Persistent user session
- ✅ Logout
- ✅ Dashboard
- ✅ Equipment list using real backend data
- ✅ Equipment details
- ✅ Availability checking
- ✅ Real booking submission
- ✅ User booking history
- ✅ Booking cancellation
- ✅ Booking completion
- ✅ Repair-report submission
- ✅ User repair-report history
- ✅ Loading and API-error feedback
- ✅ Main application navigation
- ✅ Profile screen
- ✅ Android visual assets

### Testing and Evidence

- ✅ Backend build verified
- ✅ Booking-kernel test script
- ✅ Approval-flow test script
- ✅ Equipment-endpoint test script
- ✅ Maintenance-endpoint test script
- ✅ Maintenance-booking-block test script
- ✅ Repair-ticket test script
- ✅ Audit-log test script
- ✅ Authentication flow verified
- ✅ Test logs saved
- ✅ Backend screenshots saved
- ✅ Evidence folders organized

## Current Technical Stack

| Layer | Technology |
|---|---|
| Backend | NestJS and TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT and bcrypt |
| Email Verification | Nodemailer and SMTP |
| Mobile Application | Android, Kotlin, Jetpack Compose and Material 3 |
| API Client | Retrofit and Gson |
| API Style | REST |
| Version Control | Git and GitHub |

## Repository Structure

```text
apps/
├── api/                 NestJS backend
└── android/             Android Jetpack Compose application

database/                Database-related resources
docs/                    Project documentation
evidence/                Test logs and screenshots
scripts/                 Utility and setup scripts
tests/                   Project verification resources
```

## Core Workflow

```text
Register account
      ↓
Verify email address
      ↓
Log in and receive JWT
      ↓
Browse university equipment
      ↓
Check equipment availability
      ↓
Create and manage bookings
      ↓
Submit equipment repair reports
```

## Academic Information

**Supervisor**  
Nazih Errahel

**University**  
Irkutsk National Research Technical University (INRTU)

**Student**  
Yasser Idbouzkri

## License

All rights reserved.
