# Changelog

This file tracks meaningful product milestones. Detailed implementation history remains available in Git commits.

## v1.4.0 — current `main` feature set (not yet published as a GitHub Release)

### Administration
- Added the secure CPEB Administration Portal for `ADMIN` and `LAB_MANAGER` roles.
- Added pending booking approval/rejection, searchable booking history and live inventory views.
- Added local CSV exports for filtered booking/equipment data.
- Added the Operations Center for repair reports and maintenance workflows.
- Added service-health display and modern CPEB branding.

### Android
- Refined CPEB visual identity and presentation quality.
- Added modern equipment photography and improved catalog presentation.
- Added API-contract support for equipment search/category/status filters.
- Preserved Android 7+ compatibility and the real backend integration.

### Equipment catalog
- Expanded the seeded catalog to **70 university resources**.
- Added modern lab/media equipment such as development laptops, microscopes, mixed-reality headsets, DSLR creator kits and drone equipment.
- Preserved inventory-tag uniqueness and administrator-managed status.

### API and workflows
- Added optional equipment `q`, `category` and `status` filters.
- Kept booking approval, maintenance and repair state machines backend-authoritative.
- Added deterministic inventory search/filter behavior and continued booking-conflict protection.

### Security and quality
- Extended Admin Web CI/security/API-contract checks.
- Kept protected management operations, JWT production validation, CORS/security headers and structured logging.
- Kept deep PostgreSQL E2E verification alongside Android/backend/Admin Web checks.
- Removed obsolete public sample credentials and kept secrets outside the repository.

### Repository presentation
- Reorganized project documentation around one canonical status sheet.
- Simplified the public README for academic evaluation.
- Removed obsolete recovery/generated snapshots and duplicate audit files.
- Kept evidence, roadmap and presentation material clearly separated.

## v1.3.0 — 2026-09-13

**Published GitHub Release:** `v1.3.0`

- Signed Android stabilization baseline.
- Public HTTPS backend configuration.
- APK and SHA-256 assets published through the release workflow.

> The current source on `main` is newer than the v1.3.0 packaged release. A future release can publish the v1.4.0 feature set when a new signed APK tag is created.
