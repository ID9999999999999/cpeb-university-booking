# CPEB Project Status

**Status date:** 15 September 2026  
**Repository:** `ID9999999999999/cpeb-university-booking`

## Current state

CPEB is **functionally complete for its academic scope and ready for presentation/demo**.

The current `main` branch contains the v1.4.0 feature set and the later presentation/documentation cleanup. The latest signed public Android package currently published in GitHub Releases is v1.3.0.

## Delivery status

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
| API/Admin deployment | Ready |
| Automated CI verification | Ready |

## Live links

- **Admin Web:** https://cpeb-university-booking-admin-web.onrender.com
- **API:** https://cpeb-university-booking-api-v4.onrender.com
- **Swagger:** https://cpeb-university-booking-api-v4.onrender.com/docs
- **Latest signed APK:** https://github.com/ID9999999999999/cpeb-university-booking/releases/latest
- **GitHub Actions:** https://github.com/ID9999999999999/cpeb-university-booking/actions

## Verified code baseline

The last presentation/UI code baseline is commit:

`927f313838e159df032e87398c184426674b655d`

Its CPEB CI-CD run completed successfully. Later commits reorganize documentation/evidence and do not change the executable booking implementation.

## Project scale

- **4 main layers:** Android, Admin Web, API, Database.
- **70 seeded university resources.**
- **5 user roles:** `STUDENT`, `TEACHER`, `TECHNICIAN`, `LAB_MANAGER`, `ADMIN`.
- Booking request, approval/rejection, check-out, return and closure.
- Equipment inventory management.
- Maintenance scheduling and conflict prevention.
- Repair-ticket workflow and technician actions.
- Authentication, authorization, audit history and deployment controls.

## Academic completion

### Completed

- Student/teacher booking interface.
- Administrator/lab-manager approval interface.
- Shared backend and database.
- Authentication and role-based authorization.
- Booking collision checks.
- Equipment catalog and administration.
- Maintenance and repair workflows.
- Public API and Admin Web deployment.
- Signed Android release pipeline.
- Automated backend, PostgreSQL, Android and Admin Web checks.
- Presentation-oriented repository documentation and organized evidence.

### Future improvements

These are enhancements, not missing academic core requirements:

- Push/email notifications and reminders.
- Analytics and reporting.
- Multilingual interface.
- Additional accessibility and UI polish.
- Managed backups and disaster recovery.
- Formal monitoring, alerting and rate limiting.
- Institutional penetration testing and operational procedures.

## Recommended live demo

1. Open the Android application.
2. Choose a university resource.
3. Create a booking request.
4. Open Admin Web.
5. Approve or reject the same request.
6. Return to **My Bookings** and show the changed status.

For the simplified explanation, see [`PRESENTATION.md`](PRESENTATION.md). For future work, see [`roadmap/README.md`](roadmap/README.md).
