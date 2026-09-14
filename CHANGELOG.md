# Changelog

## v1.4.0 — 2026-09-14

### Administration
- Added the secure CPEB Administration Portal for booking approvals and rejections.
- Restricted administrative web access to authorized `ADMIN` and `LAB_MANAGER` roles while keeping the backend authoritative.
- Kept admin access tokens in memory only and retained the portal security-header/CSP protections.
- Refreshed the administration portal visual system and CPEB branding.

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

### Security, delivery and maintenance
- Added Admin Web CI security and API-contract checks alongside Android and backend verification.
- Removed an obsolete seed file that contained plaintext sample credentials.
- Updated the Render blueprint and project documentation to reflect the current three-application architecture.
- Retained the hardening from the stabilization phase: protected maintenance/audit operations, safer audit responses, production JWT validation, structured errors/logging, configurable CORS, booking/maintenance lifecycle validation and deep PostgreSQL E2E checks.

## v1.3.0 — 2026-09-13

- Signed Android stabilization baseline before the Admin Web and equipment-catalog expansion.
