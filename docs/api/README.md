# API Documentation

## Available Backend Areas

- ✅ Health
- ✅ Database health
- ✅ Authentication
- ✅ User profile
- ✅ Equipment
- ✅ Bookings
- ✅ Booking approval and rejection
- ✅ Administrative operations
- ✅ Maintenance
- ✅ Repair tickets
- ✅ Audit logs

## Interactive OpenAPI Documentation

Swagger / OpenAPI is enabled. When the API runs on the default port, open:

`http://localhost:3000/docs`

Bearer-token authorization is available in Swagger UI for protected routes.

## Request Validation

A global NestJS `ValidationPipe` is enabled with whitelist and transformation. DTO validation covers the main authentication, booking, equipment, maintenance, repair-ticket, and administrative request bodies, plus booking availability query input.

## Remaining Documentation Work

- 🟡 Postman collection
- 🟡 API versioning
