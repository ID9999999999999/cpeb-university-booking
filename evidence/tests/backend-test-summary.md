Backend Test Summary

Date:
2026-07-09

Project:
University Equipment Booking System

Environment:
Windows 10
NestJS backend
PostgreSQL 16 local
Prisma v7.8.0
Docker not used
PostgreSQL Windows Service not used

Database:
PostgreSQL is started manually from CMD.

PostgreSQL command:
"C:\Program Files\PostgreSQL\16\bin\postgres.exe" -D "C:\Users\YASSER\pgdata-ueb"

Backend command:
cd /d "C:\Users\YASSER\Desktop\university-equipment-booking-system\apps\api"
npm run start:dev

Health endpoints:
GET /
GET /health
GET /db-health

Database health:
status ok
database connected
provider postgresql

Backend build:
npm run build
Result: PASSED

Implemented modules:
Health
Bookings
Approval flow
Equipment
Maintenance
Repair tickets
Audit logs

Core rule:
No two active bookings may overlap for the same equipment.

Overlap rule:
existing.startTime < requested.endTime
AND
existing.endTime > requested.startTime

Meaning:
Overlapping booking is rejected.
Adjacent booking is accepted.

Tests:

1. test-booking-kernel.js
Result: PASSED
Proof:
Valid booking accepted.
Overlapping booking rejected.
Adjacent booking accepted.
Invalid time rejected.
Equipment under maintenance rejected.

2. test-approval-flow.js
Result: PASSED
Proof:
Pending booking can be approved.
Pending booking can be rejected.
Same booking cannot be approved or rejected again.
Audit logs are created.

3. test-equipment-endpoints.js
Result: PASSED
Proof:
Equipment list works.
Single equipment view works.
Equipment creation works.
Duplicate inventoryTag is rejected.
Equipment status update works.

4. test-maintenance-endpoints.js
Result: PASSED
Proof:
Maintenance list works.
Single maintenance view works.
Maintenance creation works.
Invalid time is rejected.
Unknown equipment is rejected.
Invalid status is rejected.
Maintenance status update works.

5. test-maintenance-booking-block.js
Result: PASSED
Proof:
SCHEDULED maintenance blocks booking.
ACTIVE maintenance blocks booking.
Adjacent booking after maintenance is accepted.
COMPLETED maintenance does not block booking.
CANCELLED maintenance does not block booking.

6. test-repair-tickets.js
Result: PASSED
Proof:
Repair ticket list works.
Single repair ticket view works.
Repair ticket creation works.
Unknown equipment is rejected.
Missing title is rejected.
Invalid status is rejected.
Repair ticket status update works.

7. test-audit-logs.js
Result: PASSED
Proof:
Audit logs list works.
Single audit log view works.
Unknown audit log returns 404.
Audit logs can be filtered by equipment.
Audit logs can be filtered by booking.

Final proof:
Overlap rejected: VERIFIED
Adjacent booking accepted: VERIFIED
Maintenance booking block: VERIFIED
Approval and rejection: VERIFIED
Equipment endpoints: VERIFIED
Maintenance endpoints: VERIFIED
Repair ticket endpoints: VERIFIED
Audit logs: VERIFIED

Final statement:
Backend core verified successfully.