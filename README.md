# University Equipment Booking System

A cross-platform university equipment booking and resource scheduling system for university laboratories and educational departments.

The system allows students, teachers, laboratory managers, technicians, and administrators to manage equipment reservations, maintenance windows, repair tickets, and audit logs.

## Core Engineering Rule

The central rule of the project is:

> No two active bookings may overlap for the same equipment item.

This rule is enforced by the backend booking kernel and verified through automated Node.js test scripts.

---

## Project Status

Current status: **Backend core completed, tested, and documented with evidence**

Implemented backend modules:

- Health checks
- Database health check
- Equipment management
- Booking kernel
- Booking approval and rejection flow
- Maintenance records
- Maintenance-based booking blocking
- Repair tickets
- Audit logs
- Automated backend test scripts
- Backend evidence logs
- Screenshots evidence
- Git commit history

Frontend Flutter application will be implemented later.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | NestJS |
| Database | PostgreSQL 16 local |
| ORM | Prisma v7.8.0 |
| Prisma Adapter | @prisma/adapter-pg |
| Database Driver | pg |
| Future Frontend | Flutter |
| Operating System | Windows 10 |
| Version Control | Git |

---

## Local Environment Notes

Docker is not used at the moment.

Reason:

- Docker does not work on the current machine because virtualization is disabled.

PostgreSQL Windows Service is also not used.

Reason:

- The PostgreSQL Windows Service caused error `1067`.

The working solution is to run PostgreSQL manually from CMD.

---

## Project Path

```txt
C:\Users\YASSER\Desktop\university-equipment-booking-system
```

Backend path:

```txt
C:\Users\YASSER\Desktop\university-equipment-booking-system\apps\api
```

---

## Environment File

The backend uses a local environment file:

```txt
apps/api/.env
```

The real `.env` file is not committed to Git because it may contain local database credentials.

A safe example file is provided:

```txt
apps/api/.env.example
```

To configure the backend on a new machine, copy:

```txt
apps/api/.env.example
```

to:

```txt
apps/api/.env
```

Then edit the `DATABASE_URL` value according to the local PostgreSQL username, password, database name, and port.

Example:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/university_equipment_booking?schema=public"
```

Important:

```txt
Do not commit the real .env file.
```

---

## Running PostgreSQL Manually

Open a CMD window and run:

```cmd
"C:\Program Files\PostgreSQL\16\bin\postgres.exe" -D "C:\Users\YASSER\pgdata-ueb"
```

Keep this window open.

---

## Running the Backend

Open another CMD window:

```cmd
cd /d "C:\Users\YASSER\Desktop\university-equipment-booking-system\apps\api"
npm run start:dev
```

The backend runs on:

```txt
http://localhost:3000
```

---

## Health Endpoints

Available endpoints:

```txt
GET /
GET /health
GET /db-health
```

Example root response:

```json
{
  "message": "University Equipment Booking API",
  "status": "running"
}
```

Example database health response:

```json
{
  "status": "ok",
  "database": "connected",
  "provider": "postgresql"
}
```

---

## Database Models

The current Prisma schema includes:

```txt
User
Equipment
Booking
MaintenanceRecord
RepairTicket
AuditLog
```

Enums:

```txt
UserRole
EquipmentStatus
BookingStatus
MaintenanceStatus
RepairTicketStatus
```

---

## Seed Data

Demo users:

```txt
admin@university.test
manager@university.test
technician@university.test
student1@university.test
student2@university.test
```

Seed equipment:

```txt
Camera 01
Laptop 01
Projector 01
Microscope 01
```

---

## Implemented API Endpoints

### Equipment

```txt
GET /equipment
GET /equipment/:id
POST /equipment
PATCH /equipment/:id/status
```

Implemented behavior:

- List equipment
- Get one equipment item
- Create equipment
- Prevent duplicate inventory tags
- Update equipment status
- Write audit log for equipment status updates

---

### Bookings

```txt
GET /bookings
POST /bookings
PATCH /bookings/:id/approve
PATCH /bookings/:id/reject
```

Implemented behavior:

- Create booking request
- Reject invalid time intervals
- Reject booking if equipment does not exist
- Reject booking if active user does not exist
- Reject booking if equipment is not bookable
- Reject overlapping bookings
- Allow adjacent bookings
- Approve pending bookings
- Reject pending bookings
- Prevent approving or rejecting non-pending bookings
- Restrict approval and rejection to ADMIN and LAB_MANAGER
- Write audit logs for booking creation, approval, and rejection

---

### Maintenance

```txt
GET /maintenance
GET /maintenance/:id
POST /maintenance
PATCH /maintenance/:id/status
```

Implemented behavior:

- List maintenance records
- Get one maintenance record
- Create maintenance record
- Validate equipment existence
- Validate maintenance time interval
- Validate maintenance status
- Update maintenance status
- Write audit logs for maintenance creation and status updates

Maintenance statuses:

```txt
SCHEDULED
ACTIVE
COMPLETED
CANCELLED
```

---

### Maintenance Booking Blocking

The booking kernel checks maintenance windows.

Rule:

```txt
If maintenance status is SCHEDULED or ACTIVE
and the requested booking overlaps its time interval,
then the booking is rejected.
```

Allowed cases:

```txt
Booking that starts exactly when maintenance ends.
Booking that overlaps COMPLETED maintenance.
Booking that overlaps CANCELLED maintenance.
```

---

### Repair Tickets

```txt
GET /repair-tickets
GET /repair-tickets/:id
POST /repair-tickets
PATCH /repair-tickets/:id/status
PATCH /repair-tickets/:id/assign
```

Implemented behavior:

- List repair tickets
- Get one repair ticket
- Create repair ticket
- Validate equipment existence
- Validate title
- Validate technician role when assigned
- Update repair ticket status
- Store diagnosis
- Store evidence URL
- Assign technician
- Write audit logs for repair ticket creation, assignment, and status updates

Repair ticket statuses:

```txt
OPEN
DIAGNOSING
WAITING_PARTS
READY_FOR_TEST
RESOLVED
CLOSED
```

---

### Audit Logs

```txt
GET /audit-logs
GET /audit-logs/:id
GET /audit-logs/equipment/:equipmentId
GET /audit-logs/booking/:bookingId
```

Implemented behavior:

- List latest audit logs
- Get one audit log
- Filter logs by equipment
- Filter logs by booking
- Return related actor, equipment, and booking data

---

## Automated Test Scripts

Test scripts are stored in:

```txt
apps/api/scripts
```

Available scripts:

```txt
test-booking-kernel.js
test-approval-flow.js
test-equipment-endpoints.js
test-maintenance-endpoints.js
test-maintenance-booking-block.js
test-repair-tickets.js
test-audit-logs.js
```

---

## Running Tests

Make sure PostgreSQL is running manually.

Make sure the backend is running:

```cmd
cd /d "C:\Users\YASSER\Desktop\university-equipment-booking-system\apps\api"
npm run start:dev
```

Then run test scripts from another CMD window.

### Build

```cmd
cd /d "C:\Users\YASSER\Desktop\university-equipment-booking-system\apps\api"
npm run build
```

### Booking Kernel Test

```cmd
node scripts\test-booking-kernel.js
```

Expected behavior:

```txt
Valid booking is accepted.
Overlapping booking is rejected.
Adjacent booking is accepted.
Invalid time interval is rejected.
Equipment under maintenance is rejected.
```

### Approval Flow Test

```cmd
node scripts\test-approval-flow.js
```

Expected behavior:

```txt
Pending booking can be approved.
Approved booking cannot be approved again.
Pending booking can be rejected.
Rejected booking cannot be rejected again.
BOOKING_APPROVED and BOOKING_REJECTED audit logs are created.
```

### Equipment Endpoints Test

```cmd
node scripts\test-equipment-endpoints.js
```

Expected behavior:

```txt
Equipment list works.
Get one equipment works.
Create equipment works.
Duplicate inventoryTag is rejected.
Equipment status update works.
```

### Maintenance Endpoints Test

```cmd
node scripts\test-maintenance-endpoints.js
```

Expected behavior:

```txt
Maintenance list works.
Get one maintenance record works.
Create maintenance works.
Invalid time is rejected.
Unknown equipment is rejected.
Invalid maintenance status is rejected.
Maintenance status update works.
```

### Maintenance Booking Block Test

```cmd
node scripts\test-maintenance-booking-block.js
```

Expected behavior:

```txt
SCHEDULED maintenance blocks overlapping booking.
ACTIVE maintenance blocks overlapping booking.
Adjacent booking after maintenance is accepted.
COMPLETED maintenance does not block booking.
```

### Repair Tickets Test

```cmd
node scripts\test-repair-tickets.js
```

Expected behavior:

```txt
Repair ticket list works.
Get one repair ticket works.
Create repair ticket works.
Unknown equipment is rejected.
Missing title is rejected.
Invalid status is rejected.
Repair ticket status update works.
```

### Audit Logs Test

```cmd
node scripts\test-audit-logs.js
```

Expected behavior:

```txt
Audit log list works.
Get one audit log works.
Unknown audit log returns 404.
Filter by equipment works.
Filter by booking works.
```

---

## Latest Verified Test Status

All core backend tests passed successfully:

```txt
npm run build                         PASSED
test-booking-kernel.js                PASSED
test-approval-flow.js                 PASSED
test-equipment-endpoints.js           PASSED
test-maintenance-endpoints.js         PASSED
test-maintenance-booking-block.js     PASSED
test-repair-tickets.js                PASSED
test-audit-logs.js                    PASSED
```

---

## Evidence Package

Evidence files are stored in:

```txt
evidence/
```

The evidence package contains:

```txt
evidence/tests/backend-test-summary.md
evidence/logs/
evidence/screenshots/
```

### Evidence Logs

The `evidence/logs` folder contains saved command outputs for:

```txt
backend-build-log.txt
git-log.txt
test-booking-kernel-log.txt
test-approval-flow-log.txt
test-equipment-endpoints-log.txt
test-maintenance-endpoints-log.txt
test-maintenance-booking-block-log.txt
test-repair-tickets-log.txt
test-audit-logs-log.txt
```

### Screenshots Evidence

The `evidence/screenshots` folder contains visual proof for:

```txt
postgres-running.png
backend-running.png
api-root.png
db-health.png
equipment-list.png
booking-kernel-test.png
approval-flow-test.png
maintenance-booking-block-test.png
repair-tickets-test.png
audit-logs-test.png
evidence-logs-folder.png
readme-preview.png
```

These files prove that PostgreSQL runs locally, the NestJS backend starts correctly, the API responds, the database connection works, the equipment endpoint is accessible, and the core backend tests have recorded evidence.

---

## Git Commit History

Important commits include:

```txt
02ce136 Initial backend core with booking and approval flow
f6fcea7 Add role checks for booking approval flow
8e53c51 Add equipment endpoints
2840f11 Add maintenance endpoints
954a668 Add repair ticket endpoints
9c8af79 Add audit log endpoints
1f91a50 Update project README
f958622 Add backend evidence summary
f4b5ce0 Add booking kernel test evidence
fa40c5b Add approval flow test evidence
cd3ee82 Add equipment endpoints test evidence
85177c5 Add maintenance endpoints test evidence
2ae6ea3 Add maintenance booking block test evidence
5c81254 Add repair tickets test evidence
af7d59c Add audit logs test evidence
f63c20b Add screenshots evidence
6bf31cc Update evidence git log after screenshots
dd56e2f Add backend environment example
```

---

## Booking Kernel Logic

The system protects the invariant:

```txt
No two active bookings may overlap for the same equipment.
```

Active booking statuses checked by the booking kernel:

```txt
PENDING
APPROVED
CHECKED_OUT
```

Maintenance statuses that block booking:

```txt
SCHEDULED
ACTIVE
```

The overlap condition is:

```txt
existing.startTime < requested.endTime
AND
existing.endTime > requested.startTime
```

This allows adjacent bookings:

```txt
Existing booking: 10:00 - 12:00
New booking:      12:00 - 14:00
Result: allowed
```

---

## Current Limitations

This is an educational university project and not yet a production system.

Current limitations:

- No real authentication system yet
- Role checks currently use demo users
- No Flutter UI yet
- No file upload for repair evidence yet
- No email notifications yet
- No deployment yet
- No Docker usage because local virtualization is disabled

---

## Planned Next Steps

Recommended next steps:

```txt
1. Complete final GitHub preparation.
2. Push the clean repository to GitHub.
3. Verify that `.env` is not visible on GitHub.
4. Verify that README and evidence folders render correctly on GitHub.
5. Add Flutter UI.
6. Add simple demo authentication or user selector.
7. Add dashboard screens.
8. Prepare final project defense notes.
```

---

## Defense Summary

This project is not just a simple CRUD application.

It implements a conflict-aware reservation kernel for university equipment booking.

The backend enforces booking time validity, prevents overlapping reservations, blocks bookings during active maintenance windows, supports institutional approval flow, tracks equipment status, manages repair tickets, and records audit logs for traceability.

The most important proof is that the booking kernel has been tested through automated scripts and all core backend tests pass successfully.