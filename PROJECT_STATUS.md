# Project Status

## University Equipment Booking System

This project is a university equipment booking and resource scheduling system for laboratories and educational departments.

The backend core has been implemented and tested.

## Current Completion Status

Completed:

- Backend API using NestJS
- PostgreSQL database integration
- Prisma ORM schema
- Equipment management
- Booking creation
- Booking overlap prevention
- Booking approval and rejection flow
- Maintenance records
- Maintenance-based booking blocking
- Repair tickets
- Audit logs
- Automated backend tests
- Evidence logs
- Screenshot evidence
- GitHub repository preparation

Not completed yet:

- Flutter frontend application
- Real authentication system
- Deployment
- Email notifications
- Real file upload for repair evidence

## Core Engineering Rule

The most important rule is:

No two active bookings may overlap for the same equipment item.

The backend checks this rule before accepting a booking.

## Evidence

Evidence is stored in:

- evidence/logs
- evidence/screenshots
- evidence/tests

The README explains how to run PostgreSQL, start the backend, run tests, and verify the system.

## GitHub Status

The project has been pushed to GitHub on the main branch.

The repository includes backend code, documentation, test evidence, logs, screenshots, and README instructions.