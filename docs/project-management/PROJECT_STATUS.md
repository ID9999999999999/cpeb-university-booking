# Project Status

## CPEB University Booking System

CPEB is a university equipment and resource booking system for students and university staff.

## Current Verified State

### Completed

- NestJS backend
- PostgreSQL database integration
- Prisma ORM and migrations
- Equipment management
- Booking creation and overlap prevention
- Booking approval and rejection
- Maintenance management
- Maintenance-based booking blocking
- Repair tickets
- Audit logs
- Real user registration
- Email verification
- Real login
- Password hashing with bcrypt
- JWT authentication
- Authenticated user profile
- Database-backed user roles
- Administrative role checks
- Android application in Kotlin
- Jetpack Compose and Material 3
- Retrofit API client
- Android-to-backend integration
- Persistent authenticated session
- Equipment browsing from the real API
- Availability checking
- Real booking submission
- User booking history
- Booking cancellation and completion
- Repair report submission
- GitHub Actions CI for backend and Android
- Backend build and unit-test workflow
- Android unit-test and APK build workflow
- Test evidence and screenshots

### Remaining Before Final Academic Submission

- Swagger / OpenAPI documentation
- Postman collection
- API versioning
- Stronger global request validation
- Additional security hardening
- Expanded automated test coverage
- Production deployment, if required by the course
- Final academic report
- Final presentation
- Demonstration script
- Defense Q&A preparation
- Final tagged release

## Core Engineering Rule

No two active bookings may overlap for the same equipment item.

The backend checks this rule before accepting a booking.

## Evidence

Project evidence is stored under:

- `evidence/logs`
- `evidence/screenshots`
- `evidence/tests`

## Repository State

The repository contains both the NestJS backend and the Android Jetpack Compose application in one monorepository.
