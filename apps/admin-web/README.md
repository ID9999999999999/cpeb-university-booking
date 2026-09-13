# CPEB Administration Portal

A separate, dependency-free web portal for CPEB administrators and lab managers to review pending booking requests and approve or reject them.

## Security model

- Uses the existing backend `POST /auth/login` endpoint.
- Accepts only `ADMIN` and `LAB_MANAGER` accounts in the UI; the backend remains the final authorization authority.
- Verifies the authenticated session again with `GET /auth/me` before opening the portal.
- Keeps the bearer token in JavaScript memory only. It is never written to cookies, `localStorage`, `sessionStorage`, URLs, or DOM content.
- Server-side CSP allows API connections only to the configured API origin.
- No third-party browser libraries, fonts, analytics, CDNs, or runtime dependencies.
- User-controlled values are rendered with `textContent`, not `innerHTML`.
- Sends `credentials: omit`, `cache: no-store`, and `referrerPolicy: no-referrer` on API requests.
- Server emits CSP, frame denial, no-sniff, no-referrer, permissions policy, COOP/CORP, and no-store headers.

## Run locally

```bash
CPEB_API_BASE_URL=http://localhost:3000 npm start
```

Open `http://localhost:4173`.

On Windows PowerShell:

```powershell
$env:CPEB_API_BASE_URL = "http://localhost:3000"
npm start
```

## CI

```bash
npm run ci
```

No `npm install` is required because the portal has zero package dependencies.

## Production configuration

Set these environment variables on the web service:

- `NODE_ENV=production`
- `CPEB_API_BASE_URL=https://<production-api-host>`
- `PORT` is normally supplied by the hosting platform.

The production API must include the exact admin portal origin in its `CORS_ORIGINS` environment variable. Do not use `*` for production CORS.

## Booking flow

1. Student/teacher creates a booking → backend stores `PENDING`.
2. Admin/lab manager signs in to this portal.
3. Portal loads `GET /admin/bookings?status=PENDING`.
4. Approve → `PATCH /admin/bookings/:id/approve`.
5. Reject → `PATCH /admin/bookings/:id/reject` with optional reason up to 1000 characters.
6. The backend updates the same booking record, so the decision is returned by the existing My Bookings API to the student/teacher.
