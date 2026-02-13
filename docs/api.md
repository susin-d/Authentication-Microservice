# Auth Service API

Base URL
- Local: http://localhost:${PORT}
- Default PORT: 3000 (or use PORT in .env)

## Test Frontend
A simple HTML test interface is available at:
- http://localhost:${PORT}/

The test frontend provides forms for signup, signin, Google OAuth, and account deletion.

## Overview
This service provides email/password auth, Google OAuth, and account deletion. It uses Supabase Auth under the hood and issues a service JWT for downstream services on sign-in.

## Security Features
- Input validation on all endpoints
- Password strength requirements (8+ chars, uppercase, lowercase, number)
- Failed login protection (5 attempts max, 15-min lockout)
- Audit logging for security events
- HTTPS-only URLs enforced
- Sanitized error messages
- Cookie security (httpOnly, secure, sameSite)

See [SECURITY.md](SECURITY.md) for full security documentation.

## Authentication
Protected routes require a Bearer token:

Authorization: Bearer <access_token>

For Google OAuth, the backend sets httpOnly cookies on callback:
- auth-token (service JWT, 1 hour)
- refresh-token (Google refresh token, 30 days)

## Google OAuth Setup
This service uses direct Google OAuth integration (not through Supabase):
1. Create OAuth credentials in Google Cloud Console
2. Add authorized redirect URIs:
   - http://localhost:3000/api/v1/auth/google/callback (development)
   - https://your-domain.com/api/v1/auth/google/callback (production)
3. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env

## Environment Variables
Required
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET
- GOOGLE_CLIENT_ID (from Google Cloud Console)
- GOOGLE_CLIENT_SECRET (from Google Cloud Console)
- BREVO_API_KEY
- BREVO_SENDER_NAME
- BREVO_SENDER_EMAIL

Optional
- PORT
- FRONTEND_URL (base URL for email/OAuth redirects)
- NODE_ENV (production enables secure cookies)

## CORS Configuration
The API accepts requests from:
- localhost (any port) for development
- All *.susindran.in subdomains (e.g., app.susindran.in, auth.susindran.in)
- Credentials (cookies) are supported for authenticated requests

## Endpoints

### POST /api/v1/auth/signup
Create a user and send a verification link in the welcome email.

Request body
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "frontendUrl": "https://app.example.com"
}
```

Validation Rules
- email: Valid email format, max 255 characters
- password: Minimum 8 characters, must contain uppercase, lowercase, and number
- frontendUrl: Must be valid HTTPS URL (optional)

Rules
- frontendUrl must be a valid https:// URL.
- If frontendUrl is omitted, FRONTEND_URL is used.
- Verification redirect is ${frontendUrl}/verify.

Response 201
```json
{
  "message": "User created",
  "user_id": "<uuid>"
}
```

Errors
- 400 validation failed or email already in use

curl
```bash
curl -X POST http://localhost:5000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!","frontendUrl":"https://app.example.com"}'
Security
- Maximum 5 failed attempts allowed
- Account locked for 15 minutes after max attempts
- Failed attempts reset after 1 hour of inactivity

Request body
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

Response 200
```json
{
  "user": { "id": "<uuid>", "email": "user@example.com" },
  "access_token": "<service_jwt>",
  "refresh_token": "<supabase_refresh_token>"
}
```

Errors
- 401 invalid email or password
- 429 account temporarily locked (includes remainingMinutes)base_refresh_token>"
}
```

Errors
- 401 invalid credentials

curl
```bash
curl -X POST http://localhost:5000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!"}'
```

### DELETE /api/v1/auth/delete-account
Delete the current user. Requires Bearer token.

Headers
- Authorization: Bearer <access_token>

Response 200
```json
{
  "message": "Account deleted"
}
```

Errors
- 401 missing or invalid token
- 500 server error

curl
```bash
curl -X DELETE http://localhost:5000/api/v1/auth/delete-account \
  -H "Authorization: Bearer <access_token>"
```

### GET /api/v1/auth/google
Start Google OAuth. Redirects to Google consent screen.

Query params
- None required (uses FRONTEND_URL from environment)

Response
- 302 redirect to Google

curl (follow redirects)
```bash
curl -L "http://localhost:5000/api/v1/auth/google"
```

### GET /api/v1/auth/google/callback
Handle Google OAuth callback. Exchanges code for tokens, creates/updates user, sets cookies, and redirects.

Query params
- code (required) - OAuth authorization code from Google

Behavior
- Exchanges code directly with Google OAuth servers
- Gets user profile from Google (email, name, picture)
- Creates Supabase user if new, or finds existing user by email
- Generates service JWT for your microservices
- Sets cookies: auth-token (service JWT), refresh-token (Google refresh token)
- Redirects to FRONTEND_URL/auth/callback (from environment variable)

Errors
- 400 missing code or Google OAuth error

## Implementation Notes
- Google OAuth is handled directly using googleapis, not Supabase auth provider
- User accounts are still stored in Supabase (profiles table)
- Service JWT (auth-token) is used for communication with other microservices
- Google refresh token is stored in cookie for future token refreshes
- After OAuth callback, users are redirected to FRONTEND_URL from environment

## Notes
- FRONTEND_URL must be https:// only.
- Cookies are httpOnly=true, secure=true in production, SameSite=strict in production.
