# Changelog

## Unreleased — final university hardening

- Aligned booking creation with the documented `PENDING` approval workflow.
- Added explicit booking return lifecycle and stricter state transitions.
- Added booking and repair-ticket audit events.
- Protected maintenance and direct audit-log endpoints.
- Removed client-supplied audit actor identifiers from equipment/maintenance mutations.
- Reduced sensitive nested data returned by general equipment detail.
- Sanitized audit actor data so password and verification fields are not returned.
- Added maintenance conflict and lifecycle validation.
- Added optional repair evidence URLs and owner-only repair-ticket detail.
- Added production JWT-secret validation.
- Added consistent global error responses, request IDs, structured HTTP logs, security headers, and configurable CORS.
- Added Postman collection/environment and local Docker PostgreSQL option.
- Removed public default administrative seed passwords.
- Added backend E2E checks and CI coverage artifact.
- Made Android backend address configurable instead of developer-IP specific.
