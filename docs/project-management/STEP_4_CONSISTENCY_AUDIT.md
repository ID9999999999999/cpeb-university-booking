# Step 4 — Final Technical Hardening and GitHub-to-Code Consistency Audit

## Purpose

This step makes the public repository, executable behavior, security boundaries, developer setup, and verification pipeline tell the same story. It intentionally favors a stable university-ready system over risky late-stage architectural rewrites.

## Corrections Applied

| Area | Before Step 4 | Step 4 result |
|---|---|---|
| Booking creation | User booking service created `APPROVED` bookings while public workflow described approval | User bookings start as `PENDING` |
| Booking transitions | Some repeated/invalid transitions could be accepted | Explicit lifecycle rules reject invalid/repeated transitions |
| Return lifecycle | Checked-out resources could skip a clear return state | `CHECKED_OUT → RETURNED`, then administrative close |
| Booking audit | Admin operations were audited, ordinary user create/cancel/finish were not consistently audited | User and admin lifecycle actions create audit events |
| User validation | Booking service did not explicitly reject missing/inactive users | Missing/inactive users are rejected before creation |
| Maintenance access | Direct maintenance controller was not guarded | JWT + role guards protect maintenance routes |
| Maintenance conflicts | Direct maintenance creation did not reject booking/maintenance overlap | Both conflict classes are checked |
| Maintenance state | Equipment maintenance state could become inconsistent | Validated transitions synchronize `UNDER_MAINTENANCE`/availability |
| Audit-log access | Direct audit-log routes were publicly readable | Administrator-only access |
| Audit privacy | Related `User` data could include sensitive password/verification fields | Safe actor projection only |
| Equipment detail privacy | Detail query included booking/repair history | Detail returns the equipment resource without unrelated user history |
| Audit actor trust | Some DTOs accepted `actorId` from request bodies | Actor identity is derived from authenticated JWT |
| Repair-ticket detail | Public docs claimed detail retrieval while user API lacked it | Authenticated reporter can fetch their own ticket |
| Repair evidence | Schema had `evidenceUrl`, ordinary create flow did not accept it | Optional validated HTTP/HTTPS evidence URL is stored |
| Repair audit | User repair-ticket creation was not audited | Creation audit event added |
| Android backend address | One developer-specific LAN IP was embedded in Retrofit source | Configurable Gradle/environment base URL; emulator-safe default |
| Android booking UI | “Finish” could be shown for a pending booking | Pending bookings can be cancelled, not finished |
| Android text | Several punctuation strings contained mojibake | Text encoding artifacts are normalized |
| JWT production secret | Development fallback could be used silently | Production requires an explicit strong-enough secret |
| Seed credentials | Public seed script contained reusable default passwords | Admin/technician credentials must be supplied by environment |
| Environment docs | `.env.example` documented only the database | JWT, SMTP, CORS, port, and seed credentials documented |
| API errors | Default framework responses varied by exception | Consistent error envelope with request ID |
| HTTP logging | No central structured request log | JSON request completion/error logging with duration and request ID |
| E2E test | Boilerplate expected `Hello World!` | Health, DB, Swagger, and protected-route smoke tests |
| API client docs | Postman was listed as remaining | Postman collection + local environment supplied |
| CI verification | Build/unit tests existed | Adds coverage artifact, E2E, Prisma validation, and critical audit gate |
| Local database setup | Manual PostgreSQL setup only | Optional PostgreSQL 16 Docker Compose setup |
| Public docs | Some claims were broader/staler than code | README/API/security/changelog synchronized with behavior |

## Deliberate Safety Decisions

- No `npm audit fix --force` is used.
- No Prisma major downgrade is used to silence audit counters.
- No large framework replacement or database redesign is introduced this late in finalization.
- No commit, push, pull request, or merge is performed automatically by the local patch script.
- Local E2E execution is opt-in because it requires a prepared PostgreSQL database; CI owns the deterministic E2E gate.

## Acceptance Criteria

Step 4 is accepted only when backend unit tests/build, Android unit tests/APK build, pull-request CI, and post-merge CI all succeed. The generated APK is additionally checked for existence by the local script.
