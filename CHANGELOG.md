# Changelog

## v1.4.0 — 2026-09-14

### Administration
- Added the secure CPEB Administration Portal for booking approvals and rejections.
- Restricted administrative web access to authorized `ADMIN` and `LAB_MANAGER` roles while keeping the backend authoritative.
- Kept admin access tokens in memory only and retained the portal security-header/CSP protections.
- Refreshed the administration portal visual system and CPEB branding.
- Added a live equipment inventory with search across resource name, inventory tag, category, location and description.
- Added category and equipment-status filters with live result counts and clear status badges.
- Added role-aware equipment management: `ADMIN` can change safe manual inventory states while `LAB_MANAGER` remains read-only and workflow-owned states stay protected.
- Added searchable booking history with server-side status filtering, requester/resource search, recent-first ordering and booking status badges.
- Added privacy-preserving local CSV exports for the currently filtered booking history and equipment inventory, with Excel-friendly UTF-8 encoding and no server-side storage.
- Added a live university-services health indicator backed by the public `/health` endpoint, including last-check time, browser theme color and CPEB favicon.
- Added a dedicated Operations Center for repair reports and maintenance workflows, linked from the administration dashboard.
- Added repair-report filtering/search with only backend-authorized status transitions and a required diagnosis before resolution when missing.
- Added maintenance filtering/search with protected `SCHEDULED → ACTIVE → COMPLETED/CANCELLED` lifecycle actions and backend conflict enforcement.
- Added Operations Center summary counters for unresolved reports, active maintenance and scheduled maintenance.
- Added maintenance scheduling from the Operations Center with equipment selection, title, description and date/time window; the backend remains authoritative for booking and overlapping-maintenance conflicts.
- Added local CSV exports for the currently filtered repair-report and maintenance tables without server-side export storage.

### Android
- Refreshed the CPEB launcher identity and unified the application name as CPEB University Booking.
- Replaced four large legacy bitmap assets with lightweight vector resource illustrations.
- Updated Android system colors and theme presentation while preserving Android 7+ compatibility.
- Added Android API-contract support for equipment search, category and status filters.

### Equipment catalog
- Expanded the university catalog to 70 seeded resources across rooms, laboratories, media, sports and parking.
- Added modern equipment including a Prusa i3 3D printer, optical microscope, 100 MHz digital oscilloscope, soldering station, Raspberry Pi kit, Arduino robotics kit, VR headset, high-performance laptop, camera gimbal, action camera, USB audio interface and green screen.
- Made resource seeding transactional and validated duplicate inventory tags before database writes.
- Preserved administrator-managed equipment status when the catalog is refreshed.

### API
- Added optional `q`, `category` and `status` filters to `GET /equipment`.
- Added case-insensitive search across equipment name, inventory tag, category, location and description.
- Added validated status filtering and deterministic equipment ordering.
- Reused the existing administrative booking-status filter for the booking-history view without adding a redundant endpoint or database migration.
- Reused the existing repair-report and maintenance endpoints in the Operations Center without weakening their state machines.

### Security, delivery and maintenance
- Added Admin Web CI security and API-contract checks alongside Android and backend verification.
- Added dedicated contract tests for inventory filters, equipment status changes, booking history, service-health helpers, CSV serialization, Operations Center mutations and maintenance scheduling payloads.
- Kept the university health check independent of the administrator access token and configured it to use no-store requests.
- Kept all CSV exports entirely in the browser and excluded management-control columns from exported data.
- Removed an obsolete seed file that contained plaintext sample credentials.
- Updated the Render blueprint and project documentation to reflect the current three-application architecture.
- Retained the hardening from the stabilization phase: protected maintenance/audit operations, safer audit responses, production JWT validation, structured errors/logging, configurable CORS, booking/maintenance lifecycle validation and deep PostgreSQL E2E checks.

## v1.3.0 — 2026-09-13

- Signed Android stabilization baseline before the Admin Web and equipment-catalog expansion.
