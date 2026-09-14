# CPEB Project Status

**Status date:** 14 September 2026  
**Repository:** `ID9999999999999/cpeb-university-booking`

## Current state

CPEB is **functionally complete for its academic scope and ready for presentation/demo**.

The current `main` branch contains the v1.4.0 feature set and presentation/UI polish. The latest signed public Android package available in GitHub Releases is v1.3.0.

## Verified delivery state

| Area | Status |
|---|---|
| Android application | Ready |
| Administration portal | Ready |
| NestJS API | Ready |
| PostgreSQL persistence | Ready |
| Booking approval loop | Ready |
| Equipment inventory | Ready |
| Maintenance workflow | Ready |
| Repair workflow | Ready |
| Role-based access | Ready |
| Production deployment | Ready |
| GitHub Actions CI | Passing |

## Current production links

- **Admin Web:** https://cpeb-university-booking-admin-web.onrender.com
- **API:** https://cpeb-university-booking-api-v4.onrender.com
- **Swagger:** https://cpeb-university-booking-api-v4.onrender.com/docs
- **Latest signed APK:** https://github.com/ID9999999999999/cpeb-university-booking/releases/latest

## Latest verified main build

The presentation/UI polish on `main` was verified by the CPEB CI-CD workflow after commit:

`927f313838e159df032e87398c184426674b655d`

The corresponding GitHub Actions run completed successfully.

## Project scale

- **4 main layers:** Android, Admin Web, API, Database.
- **70 seeded university resources.**
- **5 user roles:** `STUDENT`, `TEACHER`, `TECHNICIAN`, `LAB_MANAGER`, `ADMIN`.
- Resource booking, approval, check-out, return and closure.
- Equipment inventory management.
- Maintenance scheduling and conflict prevention.
- Repair-ticket workflow and technician actions.
- Audit history and production security controls.

## Academic completion

### Completed

- Student/teacher booking interface.
- Administrator/lab-manager approval interface.
- Shared backend and database.
- Authentication and authorization.
- Booking collision checks.
- Equipment catalog and administration.
- Maintenance and repair workflows.
- Public API and Admin Web deployment.
- Signed Android release pipeline.
- Automated backend, PostgreSQL, Android and Admin Web checks.

### Future improvements

These are enhancements rather than missing academic core requirements:

- Push/email notifications and reminders.
- More analytics and reporting.
- Multilingual interface.
- Additional design polish and accessibility work.
- Managed backups and disaster recovery.
- Formal monitoring and alerting.
- Rate limiting and production observability.
- Institutional penetration testing and operational procedures.

## Recommended presentation demo

1. Open the Android application.
2. Choose a university resource.
3. Create a booking request.
4. Open Admin Web.
5. Approve/reject the same request.
6. Return to **My Bookings** and show the changed status.

For the simplified explanation, see [`PRESENTATION.md`](PRESENTATION.md).
