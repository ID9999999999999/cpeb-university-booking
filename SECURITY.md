# Security Policy

## Project status

CPEB is an educational university project. Core authentication and authorization are implemented, but the repository is not represented as a fully operated production service.

## Implemented controls

- Password hashing with bcrypt
- JWT authentication
- Database-backed role checks
- Inactive-user rejection
- Email-verification codes stored as bcrypt hashes
- DTO validation and input whitelisting
- Protected maintenance and audit routes
- Ownership checks for student repair-ticket detail
- Safe audit actor projections that do not expose password hashes
- Production JWT-secret validation
- Request IDs and structured HTTP logging
- Basic HTTP security headers
- CI check that rejects critical runtime dependency vulnerabilities

## Secret handling

Do not commit:

- `.env` files
- database passwords
- JWT secrets
- SMTP credentials
- private keys
- real personal data

The administrative seed script requires credentials from environment variables and does not contain a usable default administrator password.

## Reporting a vulnerability

Do not disclose credentials, tokens, private data, or exploitable security details in a public issue. Report security concerns privately to the repository owner.

## Remaining production controls

A production deployment should additionally use infrastructure TLS, managed secret storage, production-grade rate limiting, centralized monitoring/alerting, database backup and recovery procedures, dependency patch management, and formal security testing.
