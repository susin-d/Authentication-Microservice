# Stellar Auth Service

A Node.js authentication service built with Express and Supabase, providing email/password authentication, Google OAuth support, and JWT token management with Zoho Mail integration for no-reply verification emails.

## Features

- ✅ Email and password sign up
- ✅ Email and password sign in
- ✅ Sign out functionality
- ✅ Google OAuth integration
- ✅ Session management
- ✅ JWT token generation and verification
- ✅ JWT token refresh
- ✅ Protected routes with JWT middleware
- ✅ Password reset via email
- ✅ Rate limiting
- ✅ CSRF protection for OAuth
- ✅ Strong password requirements
- ✅ Email verification with Zoho Mail
- ✅ No-reply verification emails
- ✅ Comprehensive security headers (Helmet)
- ✅ Input sanitization and validation
- ✅ Token binding to user context
- ✅ Secure error handling
- ✅ Delete account functionality

## Prerequisites

- Node.js (v18 or higher)
- A Supabase project account

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Navigate to **Project Settings** > **API**
4. Copy your `Project URL` and `anon public` key

### 2. Configure Google OAuth in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Providers**
3. Enable **Google** provider
4. Add your Google OAuth Client ID and Client Secret
5. Set the redirect URL to: `http://localhost:3000/auth/callback/google`

### 3. Configure Zoho Mail for Email Verification

1. Log in to your Zoho Mail account
2. Navigate to **Settings** > **Mail Accounts**
3. Note your email address and generate an **App Password**:
   - Go to **Security** > **App Passwords**
   - Create a new app password for your application
   - Copy the generated password (you'll need it for `ZOHO_PASSWORD`)
4. Ensure your Zoho Mail plan supports SMTP access

**Note:** For no-reply emails, you can use a dedicated email address like `noreply@yourdomain.com` if you have a custom domain with Zoho Mail.

### 4. Install Dependencies

```bash
npm install
```

### 5. Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

2. Update the `.env` file with your Supabase credentials:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Server Configuration
PORT=3000
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your_session_secret_key_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here (minimum 32 characters)
JWT_EXPIRES_IN=7d
JWT_VERIFY_SECRET=your_verification_token_secret (minimum 32 characters)

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://yourfrontend.com

# Zoho Mail Configuration
ZOHO_EMAIL=your@domain.com
ZOHO_PASSWORD=your_app_password
ZOHO_SMTP_HOST=smtp.zoho.com
ZOHO_SMTP_PORT=587
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=https://yourfrontend.com

# Email Verification
EMAIL_VERIFICATION_EXPIRES_IN=24h
```

**Important Security Notes:**
- `JWT_SECRET` must be at least 32 characters long
- `JWT_SECRET` is required - the service will fail to start without it
- Use a strong, random value for `JWT_SECRET` in production
- Configure `ALLOWED_ORIGINS` with your frontend domains (comma-separated)
- Set `NODE_ENV=production` in production for enhanced security features

### 6. Start the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

The server will start on `http://localhost:3000` (Local) or `https://auth.susindran.in` (Production)

## API Endpoints

### Health Check
```
GET /health
```

### Authentication Endpoints

#### Sign Up
```
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Password Requirements:**
- At least 8 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Cannot be a common password

#### Sign In
```
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
**Response includes JWT tokens:**
```json
{
  "success": true,
  "message": "Sign in successful",
  "data": {
    "user": {...},
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "jwt_refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Sign Out
```
POST /api/auth/signout
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "access_token": "your_access_token",
  "refresh_token": "your_refresh_token"
}

#### Delete Account
```
DELETE /api/auth/delete-account
Authorization: Bearer <jwt_token>
```
Permanently deletes the current user's account from the database.
```

#### Get Session
```
POST /api/auth/session
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "access_token": "your_access_token"
}
```

#### Google OAuth
```
POST /api/auth/google
```
Returns a Google OAuth URL for the user to authenticate along with a state parameter for CSRF protection.

#### Google OAuth Callback
```
POST /api/auth/callback/google
Content-Type: application/json

{
  "access_token": "xxx",
  "refresh_token": "xxx",
  "state": "xxx"
}
```

**Important:** The callback now uses POST method and accepts tokens in the request body, not URL query parameters, to prevent token exposure in logs and browser history.

#### Refresh Token
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "your_refresh_token"
}
```

#### Refresh JWT Token
```
POST /api/auth/refresh-jwt
Content-Type: application/json

{
  "jwt_refresh_token": "your_jwt_refresh_token"
}
```
**Response:**
```json
{
  "success": true,
  "message": "JWT token refreshed successfully",
  "data": {
    "token": "new_jwt_token...",
    "refresh_token": "new_refresh_token...",
    "user": {...}
  }
}
```

#### Reset Password
```
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Verify Email
```
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "verificationToken": "your_verification_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now sign in."
}
```

#### Resend Verification Email
```
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password with Token
```
POST /api/auth/reset-password/confirm
Content-Type: application/json

{
  "email": "user@example.com",
  "resetToken": "your_reset_token",
  "newPassword": "NewSecurePass123!"
}
```

## Project Structure

```
stellar-auth-service/
├── config/
│   └── supabase.js          # Supabase client configuration
├── controllers/
│   └── authController.js    # Authentication logic
├── routes/
│   └── authRoutes.js        # API routes
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── services/
│   ├── emailService.js      # Zoho Mail email service
│   └── emailTemplates.js    # HTML email templates
├── utils/
│   └── jwt.js               # JWT utility functions
├── src/
│   └── server.js            # Main server file
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── package.json             # Project dependencies
└── README.md                # This file
```

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "requestId": "uuid"  // Unique request ID for debugging
}
```

## Security Features

### 1. JWT Token Security
- **Algorithm Validation**: Only HS256 algorithm is accepted
- **Issuer & Audience Claims**: Tokens are validated against configured issuer and audience
- **Token Binding**: Tokens are bound to user agent and IP address
- **Short Access Token Expiry**: Access tokens expire in 15 minutes
- **Refresh Token Expiry**: Refresh tokens expire in 7 days
- **Unique JTI Claims**: Each token has a unique ID for tracking

### 2. Strong JWT Secret Requirements
- JWT_SECRET must be at least 32 characters long
- No default fallback secret - the service will fail to start without a properly configured JWT_SECRET
- Uses cryptographically secure random state generation for OAuth

### 3. Rate Limiting
- **Auth endpoints** (signup, signin, refresh): 5 attempts per 15 minutes per IP
- **Email verification**: 10 attempts per hour per email/IP
- **General API endpoints**: 100 requests per 15 minutes per IP
- Rate limit headers included in responses

### 4. CORS Protection
- Configurable allowed origins via `ALLOWED_ORIGINS` environment variable
- Requests from non-whitelisted origins are blocked
- No wildcard (`*`) configuration allowed in production

### 5. CSRF Protection for OAuth
- Uses cryptographically secure state parameter for Google OAuth
- State parameter expires after 10 minutes
- State validation on callback prevents CSRF attacks

### 6. Strong Password Requirements
- Minimum 8 characters, maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Cannot be a common password

### 7. Security Headers (Helmet)
- Content Security Policy (CSP)
- X-Frame-Options (DENY)
- X-Content-Type-Options
- XSS Filter
- HSTS (HTTP Strict Transport Security) in production
- Cross-Origin Resource Policy

### 8. Input Validation & Sanitization
- Comprehensive email format validation
- SQL injection prevention
- XSS prevention via input sanitization
- Log injection prevention

### 9. Token Security
- JWT tokens include unique JTI (JWT ID) claim for token identification
- OAuth tokens are not exposed in URL query parameters
- Callback uses POST method to receive tokens securely
- Token binding to user context (user agent and IP)

### 10. Secure Error Handling
- Generic error messages in production (no sensitive data leakage)
- Request ID tracking for debugging
- Stack traces only shown in development mode
- No user existence information in login errors

### 11. Logging Security
- Request ID tracking for all requests
- Sensitive data (passwords, tokens) never logged
- Input sanitization to prevent log injection
- Structured JSON logging

## Security Notes

1. **Environment Variables**: Never commit `.env` file to version control
2. **HTTPS**: Use HTTPS in production for all authentication endpoints
3. **CORS**: Configure CORS origin to match your frontend domain in production
4. **Session Secret**: Use a strong, random session secret key
5. **JWT Secret**: Use a strong, random JWT secret key (minimum 32 characters) - **REQUIRED**
6. **Token Storage**: Store tokens securely on the client side (httpOnly cookies recommended)
7. **Rate Limiting**: Auth endpoints have strict rate limits to prevent brute force attacks
8. **OAuth State**: Always validate the state parameter returned during OAuth callbacks
9. **NODE_ENV**: Set to `production` in production for enhanced security
10. **Regular Updates**: Run `npm audit` regularly to check for vulnerabilities

## JWT Token Usage

### Token Structure
The JWT token contains the following payload:
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "role": "user",
  "created_at": "2024-01-01T00:00:00.000Z",
  "jti": "uuid-string",
  "iss": "stellar-auth-service",
  "aud": "stellar-users",
  "ua": "hashed_user_agent",
  "ip": "hashed_ip",
  "iat": 1234567890,
  "exp": 1235172690
}
```

### Using JWT Tokens
Include the JWT token in the `Authorization` header for protected routes:
```
Authorization: Bearer <your_jwt_token>
```

### Token Expiration
- **Access Token**: 15 minutes
- **Refresh Token**: 7 days
- **Email Verification Token**: 24 hours (configurable)
- **Password Reset Token**: 1 hour
- **OAuth State**: 10 minutes

### Creating Protected Routes
Use the `authenticate` middleware to protect routes:
```javascript
import { authenticate } from './middleware/auth.js';

router.get('/protected', authenticate, (req, res) => {
  // req.user contains the decoded JWT payload
  res.json({ message: 'Protected data', user: req.user });
});
```

### Role-Based Access Control
Use the `authorize` middleware for role-based access:
```javascript
import { authenticate, authorize } from './middleware/auth.js';

router.get('/admin', authenticate, authorize('admin'), (req, res) => {
  res.json({ message: 'Admin only data' });
});
```

## Security Best Practices for Clients

1. **Store tokens securely**: Use httpOnly cookies or secure storage
2. **Handle token expiration**: Implement automatic token refresh
3. **Validate certificates**: Only trust valid HTTPS certificates
4. **Check response headers**: Verify security headers are present
5. **Handle errors gracefully**: Don't expose sensitive information
6. **Implement retry logic**: For network failures
7. **Use request IDs**: For debugging issues

## Dependency Security

Run the following commands regularly to check for vulnerabilities:

```bash
# Check for vulnerabilities
npm audit

# Automatically fix vulnerabilities
npm audit fix
```

## Troubleshooting

### Supabase Connection Issues
- Verify your `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
