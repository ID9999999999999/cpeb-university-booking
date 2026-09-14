# CPEB Presentation Guide

This page is the short, non-technical explanation of the project for a classroom or committee presentation.

## 1. What is CPEB?

**CPEB University Booking** is a system that lets students and teachers request university resources and lets authorized staff approve, reject and manage those requests.

The project is not only a mobile interface. It contains four connected layers:

1. **Android App** — student/teacher side.
2. **Backend API** — rules, authentication and booking logic.
3. **PostgreSQL Database** — users, resources, bookings, maintenance and repair data.
4. **Admin Website** — approval and management side.

## 2. The simple story

```text
Student chooses a resource
          ↓
Student sends a booking request
          ↓
Request becomes PENDING
          ↓
Admin sees the request
          ↓
Admin APPROVES or REJECTS
          ↓
Student sees the decision in My Bookings
```

This is the main story to show during the presentation.

## 3. Live demo sequence

### Step 1 — Android App

Open the Android application and show the resource catalog.

Explain only:

> “The student can browse university resources and see what is available.”

### Step 2 — Create a booking

Choose one resource, select a date/time and submit the request.

Explain:

> “The booking starts as pending because an administrator must review it.”

### Step 3 — Admin Website

Open the public administration portal:

https://cpeb-university-booking-admin-web.onrender.com

Show the pending request.

Explain:

> “The same request appears on the administration side.”

### Step 4 — Approve or reject

Approve the request.

Explain:

> “The backend validates the action and stores the decision in the database.”

### Step 5 — Back to Android

Return to **My Bookings** and show the new status.

Explain:

> “The student now sees the administrator's decision. This proves that the app, backend, database and website are connected.”

## 4. Project size

Useful numbers to mention:

- **4 main layers:** Android, API, Database, Admin Web.
- **70 seeded resources** across university categories.
- **5 roles:** Student, Teacher, Technician, Lab Manager, Admin.
- Booking, equipment, maintenance and repair workflows.
- Public deployment plus automated CI/CD verification.

## 5. Main technologies

| Layer | Technology |
|---|---|
| Android | Kotlin, Jetpack Compose, Material 3 |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL 16, Prisma |
| Admin Web | Browser UI + Node static server |
| Deployment | Render + GitHub Actions |

## 6. Security in simple words

If the committee asks about security, answer simply:

- Passwords are hashed.
- Authentication uses JWT tokens.
- Different users have different permissions.
- Admin functions are protected.
- The backend prevents invalid booking conflicts and invalid state changes.
- CI checks the project automatically.

## 7. What is complete?

The academic core is complete:

- Android booking client.
- Admin approval portal.
- Backend and PostgreSQL database.
- Booking lifecycle.
- Equipment management.
- Maintenance and repair workflows.
- Authentication and authorization.
- Public deployment.
- Automated testing / CI.

## 8. Future development

The project can continue with:

- Notifications and reminders.
- More analytics and reports.
- More languages.
- Additional UI/UX polish.
- Stronger institutional monitoring, backups and disaster recovery.

## 9. One-sentence conclusion

> **CPEB is a complete university resource-booking platform that connects students and administrators through one secure booking workflow.**
