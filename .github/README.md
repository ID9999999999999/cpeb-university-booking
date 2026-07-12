# CPEB University Booking System

A university equipment and resource booking system built with **NestJS**, **Prisma**, **PostgreSQL**, and **Android Jetpack Compose**.

## Project Status

This repository shows the complete project roadmap and the current implementation state.

Legend:

- ✅ Completed
- ❌ Not completed yet

## Completed

### Project Foundation

- ✅ Project scope and problem definition
- ✅ Core business rule defined: no overlapping active bookings for the same equipment
- ✅ Public GitHub repository created
- ✅ Clean repository structure prepared
- ✅ Backend and Android applications stored in one repository
- ✅ Environment example file added
- ✅ Sensitive local files excluded from Git

### Backend — NestJS

- ✅ NestJS API project created
- ✅ PostgreSQL connection implemented
- ✅ Prisma ORM configured
- ✅ Health endpoint implemented
- ✅ Database health endpoint implemented
- ✅ Equipment module implemented
- ✅ Booking module implemented
- ✅ Approval and rejection flow implemented
- ✅ Maintenance module implemented
- ✅ Repair-ticket module implemented
- ✅ Audit-log module implemented

### Database — Prisma and PostgreSQL

- ✅ User model
- ✅ Equipment model
- ✅ Booking model
- ✅ MaintenanceRecord model
- ✅ RepairTicket model
- ✅ AuditLog model
- ✅ Core enums defined
- ✅ Initial migration created
- ✅ Seed data created
- ✅ Demo users created
- ✅ Demo equipment created

### Equipment Management

- ✅ List equipment
- ✅ Get one equipment item
- ✅ Create equipment
- ✅ Reject duplicate inventory tags
- ✅ Update equipment status
- ✅ Record equipment-status changes in audit logs

### Booking System

- ✅ Create booking requests
- ✅ Validate booking time intervals
- ✅ Reject unknown equipment
- ✅ Reject unknown or inactive users
- ✅ Reject non-bookable equipment
- ✅ Reject overlapping bookings
- ✅ Allow adjacent bookings
- ✅ Approve pending bookings
- ✅ Reject pending bookings
- ✅ Prevent repeated approval or rejection
- ✅ Restrict approval and rejection to authorized roles
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
- ✅ Validate related equipment
- ✅ Validate ticket title
- ✅ Assign technicians
- ✅ Validate technician role
- ✅ Update repair-ticket status
- ✅ Store diagnosis
- ✅ Store evidence URL
- ✅ Record repair-ticket actions in audit logs

### Audit Logs

- ✅ List latest audit logs
- ✅ Get one audit log
- ✅ Filter logs by equipment
- ✅ Filter logs by booking
- ✅ Return related actor and resource data

### Testing and Evidence

- ✅ Backend build verified
- ✅ Booking-kernel test script
- ✅ Approval-flow test script
- ✅ Equipment-endpoint test script
- ✅ Maintenance-endpoint test script
- ✅ Maintenance-booking-block test script
- ✅ Repair-ticket test script
- ✅ Audit-log test script
- ✅ Test logs saved
- ✅ Backend screenshots saved
- ✅ Evidence folders organized

### Android Application

- ✅ Android project created
- ✅ Kotlin configured
- ✅ Jetpack Compose configured
- ✅ Material 3 configured
- ✅ Main application shell created
- ✅ Welcome interface created
- ✅ Dashboard prototype created
- ✅ Equipment and booking interface prototypes created
- ✅ Profile and student-facing screen prototypes created
- ✅ Android visual assets added

## Not Completed Yet

### Authentication and User Management

- ❌ Real user registration
- ❌ Real login system
- ❌ JWT authentication
- ❌ Password hashing
- ❌ Password reset
- ❌ Complete role-based access control for all endpoints
- ❌ User-profile editing
- ❌ Administrative user and role management

### Backend Quality and Security

- ❌ DTO-based validation with class-validator
- ❌ Centralized environment configuration with @nestjs/config
- ❌ Global exception filter
- ❌ Structured logging
- ❌ API versioning
- ❌ Rate limiting
- ❌ Production CORS policy
- ❌ Security hardening
- ❌ Dependency-security audit
- ❌ Production-ready error responses

### Database Improvements

- ❌ Final database indexes
- ❌ Additional database constraints
- ❌ Database-level overlap protection
- ❌ Equipment-availability views
- ❌ Production connection pooling
- ❌ Backup and recovery strategy
- ❌ Expanded realistic seed data

### Android–Backend Integration

- ❌ Connect Android application to the NestJS API
- ❌ Real API client
- ❌ Token storage and session management
- ❌ Real login screen behavior
- ❌ Real equipment data from the backend
- ❌ Real booking submission
- ❌ Real booking history
- ❌ Real approval workflow in the application
- ❌ Loading, empty, and API-error states
- ❌ Complete application navigation
- ❌ Localization
- ❌ Accessibility review
- ❌ Tablet and multi-screen responsiveness

### Remaining Booking Features

- ❌ Booking cancellation
- ❌ Booking modification
- ❌ User booking history
- ❌ Recurring bookings
- ❌ Waitlist
- ❌ Email notifications
- ❌ Check-in and check-out
- ❌ Booking reminders

### Equipment and Facility Features

- ❌ Equipment categories
- ❌ Real equipment-image upload
- ❌ Facility, building, room, and laboratory management
- ❌ Recurring maintenance scheduling
- ❌ Complete repair-ticket lifecycle
- ❌ Spare-parts inventory

### Reports and Analytics

- ❌ Equipment-utilization reports
- ❌ Booking reports
- ❌ Maintenance reports
- ❌ Audit reports
- ❌ CSV or PDF export
- ❌ Administrative analytics dashboard

### Testing and Quality Assurance

- ❌ Complete unit-test coverage
- ❌ Complete integration tests
- ❌ Complete end-to-end tests
- ❌ Android widget and UI tests
- ❌ Test-coverage reports
- ❌ Coverage target above 80%
- ❌ Load and performance testing
- ❌ Security testing
- ❌ Accessibility testing

### API Documentation

- ❌ Swagger / OpenAPI documentation
- ❌ Postman collection
- ❌ Architecture diagram
- ❌ Database ER diagram
- ❌ Complete developer documentation

### DevOps and Deployment

- ❌ Backend Dockerfile
- ❌ Complete Docker Compose environment
- ❌ GitHub Actions CI pipeline
- ❌ Automated backend tests on push
- ❌ Automated Android build on push
- ❌ Container registry
- ❌ Staging environment
- ❌ Production deployment
- ❌ Hosted PostgreSQL database
- ❌ HTTPS and domain configuration
- ❌ Monitoring and production logging
- ❌ Continuous deployment pipeline

### Final Academic Submission

- ❌ Final project report
- ❌ Final presentation
- ❌ Video demonstration
- ❌ Live-demo script
- ❌ Defense questions and answers preparation
- ❌ Final code refactoring
- ❌ Final UX polish
- ❌ Final security review
- ❌ Final release tag

## Current Technical Stack

| Layer | Technology |
|---|---|
| Backend | NestJS |
| Database | PostgreSQL |
| ORM | Prisma |
| Mobile Application | Android, Kotlin, Jetpack Compose |
| Version Control | Git and GitHub |

## Repository Structure
