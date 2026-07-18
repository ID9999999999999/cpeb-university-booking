# CPEB University Booking System

[![CPEB CI-CD](https://github.com/ID9999999999999/cpeb-university-booking/actions/workflows/ci-cd.yml/badge.svg?branch=main&event=push)](https://github.com/ID9999999999999/cpeb-university-booking/actions/workflows/ci-cd.yml)


A university equipment and resource booking system built with **NestJS**, **Prisma**, **PostgreSQL**, and **Android Jetpack Compose**.

The project provides an academic booking workflow for students and university staff, including authentication, equipment management, booking validation, maintenance management, repair tickets, administrative operations, and audit tracking.

## Implemented Features

### Project Foundation

- âœ… Project scope and problem definition
- âœ… Core business rule: no overlapping active bookings for the same equipment
- âœ… Public GitHub repository
- âœ… Clean monorepository structure
- âœ… Backend and Android applications stored in one repository
- âœ… Environment example file
- âœ… Sensitive local files excluded from Git

### Backend â€” NestJS

- âœ… NestJS REST API
- âœ… PostgreSQL connection
- âœ… Prisma ORM integration
- âœ… Health endpoint
- âœ… Database health endpoint
- âœ… Authentication module
- âœ… Equipment module
- âœ… Booking module
- âœ… Administrative module
- âœ… Maintenance module
- âœ… Repair-ticket module
- âœ… Audit-log module

### Authentication and User Management

- âœ… Real user registration
- âœ… Email-verification workflow
- âœ… Verification-code resend endpoint
- âœ… Real user login
- âœ… Password hashing with bcrypt
- âœ… JWT authentication
- âœ… Authenticated user-profile endpoint
- âœ… User roles stored in the database
- âœ… Role-based administrative access
- âœ… Administrative user and role management

### Database â€” Prisma and PostgreSQL

- âœ… User model
- âœ… Equipment model
- âœ… Booking model
- âœ… MaintenanceRecord model
- âœ… RepairTicket model
- âœ… AuditLog model
- âœ… Core enums
- âœ… User-role enum
- âœ… Initial migration
- âœ… Seed data
- âœ… Demo users
- âœ… Administrative user
- âœ… Demo equipment

### Equipment Management

- âœ… List equipment
- âœ… Get one equipment item
- âœ… Create equipment
- âœ… Reject duplicate inventory tags
- âœ… Update equipment status
- âœ… Filter administrative equipment data
- âœ… Record equipment-status changes in audit logs

### Booking System

- âœ… Create booking requests
- âœ… Validate booking time intervals
- âœ… Check equipment availability
- âœ… Reject unknown equipment
- âœ… Reject unknown or inactive users
- âœ… Reject non-bookable equipment
- âœ… Reject overlapping bookings
- âœ… Allow adjacent bookings
- âœ… Display the authenticated user's booking history
- âœ… Cancel bookings
- âœ… Finish bookings
- âœ… Approve pending bookings
- âœ… Reject pending bookings
- âœ… Administrative check-out and closing operations
- âœ… Prevent repeated approval or rejection
- âœ… Restrict administrative booking actions by role
- âœ… Record booking actions in audit logs

### Maintenance

- âœ… List maintenance records
- âœ… Get one maintenance record
- âœ… Create maintenance records
- âœ… Validate maintenance intervals
- âœ… Validate maintenance status
- âœ… Update maintenance status
- âœ… Block bookings that overlap active or scheduled maintenance
- âœ… Allow bookings after maintenance ends
- âœ… Record maintenance actions in audit logs

### Repair Tickets

- âœ… List repair tickets
- âœ… Get one repair ticket
- âœ… Create repair tickets
- âœ… Display the authenticated user's reports
- âœ… Validate related equipment
- âœ… Validate ticket titles
- âœ… Assign technicians
- âœ… Validate technician roles
- âœ… Update repair-ticket status
- âœ… Store diagnoses
- âœ… Store evidence URLs
- âœ… Record repair-ticket actions in audit logs

### Audit Logs

- âœ… List audit logs
- âœ… Get one audit log
- âœ… Filter logs by equipment
- âœ… Filter logs by booking
- âœ… Return related actor and resource data
- âœ… Administrative audit access

### Android Application

- âœ… Android project
- âœ… Kotlin
- âœ… Jetpack Compose
- âœ… Material 3
- âœ… Real connection to the NestJS API
- âœ… Retrofit API client
- âœ… Registration screen and backend registration
- âœ… Email-verification screen
- âœ… Login screen and backend authentication
- âœ… JWT token storage
- âœ… Persistent user session
- âœ… Logout
- âœ… Dashboard
- âœ… Equipment list using real backend data
- âœ… Equipment details
- âœ… Availability checking
- âœ… Real booking submission
- âœ… User booking history
- âœ… Booking cancellation
- âœ… Booking completion
- âœ… Repair-report submission
- âœ… User repair-report history
- âœ… Loading and API-error feedback
- âœ… Main application navigation
- âœ… Profile screen
- âœ… Android visual assets

### Testing and Evidence

- âœ… Backend build verified
- âœ… Booking-kernel test script
- âœ… Approval-flow test script
- âœ… Equipment-endpoint test script
- âœ… Maintenance-endpoint test script
- âœ… Maintenance-booking-block test script
- âœ… Repair-ticket test script
- âœ… Audit-log test script
- âœ… Authentication flow verified
- âœ… Test logs saved
- âœ… Backend screenshots saved
- âœ… Evidence folders organized

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
â”œâ”€â”€ api/                 NestJS backend
â””â”€â”€ android/             Android Jetpack Compose application

database/                Database-related resources
docs/                    Project documentation
evidence/                Test logs and screenshots
scripts/                 Utility and setup scripts
tests/                   Project verification resources
```

## Core Workflow

```text
Register account
      â†“
Verify email address
      â†“
Log in and receive JWT
      â†“
Browse university equipment
      â†“
Check equipment availability
      â†“
Create and manage bookings
      â†“
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

<!-- refresh-readme-render -->
