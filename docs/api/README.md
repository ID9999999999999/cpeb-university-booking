# API Documentation

## Available Areas

- ✅ Health and database health
- ✅ Registration, verification, login, and current-user profile
- ✅ Equipment
- ✅ Student bookings
- ✅ Administrative booking lifecycle
- ✅ Maintenance
- ✅ Repair tickets
- ✅ Administrative operations
- ✅ Audit logs

## Swagger / OpenAPI

Start the backend and open:

```text
http://localhost:3000/docs
```

Swagger includes bearer-token authorization for protected endpoints.

## Request Validation

The API uses a global NestJS `ValidationPipe` with whitelist and transformation. DTO validation covers the principal authentication, booking, equipment, maintenance, repair-ticket, and administrative inputs.

## Error Responses

HTTP errors use a consistent response structure containing:

```text
statusCode
error
message
method
path
timestamp
requestId
```

The response also includes an `x-request-id` header that can be correlated with structured backend HTTP logs.

## Postman

Import both files:

```text
CPEB_University_Booking_API.postman_collection.json
CPEB_Local.postman_environment.json
```

The collection includes health, authentication, equipment, booking, administration, maintenance, repair-ticket, and audit requests. Successful login stores the JWT automatically in the `accessToken` collection variable.

## API Version

Swagger identifies the current contract as version `1.0`. URI-level versioning is intentionally deferred because changing all routes would be a breaking change for the current Android client.
