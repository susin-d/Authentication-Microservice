# LLM Guide: Working with M-Auth v1.0.1

**Target Audience:** Language Models (AI Assistants) helping developers with this codebase  
**Last Updated:** February 12, 2026  
**Version:** 1.0.1

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Common Tasks](#common-tasks)
5. [Code Patterns](#code-patterns)
6. [Security Features](#security-features)
7. [Debugging Guide](#debugging-guide)
8. [Testing Guide](#testing-guide)
9. [Deployment Guide](#deployment-guide)
10. [Best Practices](#best-practices)

---

## Project Overview

### What is M-Auth?
M-Auth is a production-ready **authentication microservice** built with:
- **Backend:** Node.js + Express 5.2.1
- **Database:** Supabase (PostgreSQL)
- **Auth Methods:** Email/Password, Google OAuth 2.0
- **Security:** 10 comprehensive security features
- **Email:** Brevo transactional emails (official SDK: @getbrevo/brevo)

### Version Information
- **Current Version:** 1.0.1
- **Entry Point:** `server.js` (loads `src/server.js`)
- **API Base:** `/api/v1/auth`
- **Port:** 3000 (configurable via PORT env var)

### Key Features
1. JWT-based authentication (1-hour expiry)
2. Google OAuth with direct API integration
3. Email verification via Brevo (official SDK)
4. Failed login protection (5 attempts, 15-min lockout)
5. Audit logging for security events
6. Input validation with password strength rules
7. CORS whitelist configuration
8. Secure cookie management
9. HTTPS enforcement
10. Comprehensive error sanitization

---

## Architecture

### Request Flow
```
Client Request
    ↓
CORS Middleware (whitelist check)
    ↓
Helmet Security Headers
    ↓
Cookie Parser
    ↓
Morgan Logger
    ↓
Routes (/api/v1/auth)
    ↓
Validation Middleware (express-validator)
    ↓
Controllers (HTTP handlers)
    ↓
Services (Business logic)
    ↓
Supabase (Database)
    ↓
Response (sanitized errors)
```

### Layer Responsibilities

**Routes** (`src/routes/auth.routes.js`):
- Define endpoints
- Attach validation middleware
- Map to controllers

**Controllers** (`src/controllers/auth.controller.js`):
- Handle HTTP request/response
- Call services
- Track login attempts
- Log audit events
- Sanitize errors

**Services** (`src/services/auth.service.js`):
- Business logic
- Database operations
- External API calls (Google OAuth)
- Email triggers

**Middleware**:
- `auth.middleware.js` - JWT verification
- `validator.middleware.js` - Input validation

**Utilities**:
- `audit.logger.js` - Security event logging
- `login.tracker.js` - Failed login tracking

---

## File Structure

### Critical Files to Know

**Configuration:**
- `.env` - Environment variables (NEVER commit)
- `src/config/supabase.js` - Database client
- `src/config/security.config.js` - Security settings (CORS, cookies, etc)

**Entry Points:**
- `server.js` - Main entry (loads src/server.js)
- `src/server.js` - Express app setup

**Core Logic:**
- `src/services/auth.service.js` - Auth business logic
- `src/controllers/auth.controller.js` - HTTP handlers
- `src/routes/auth.routes.js` - Route definitions

**Security:**
- `src/middleware/validator.middleware.js` - Input validation
- `src/utils/audit.logger.js` - Security logging
- `src/utils/login.tracker.js` - Brute force protection

**Database:**
- `migrations/001_security_tables.sql` - Schema for audit_logs, login_attempts

**Documentation:**
- `README.md` - Main documentation
- `QUICK-START.md` - Setup guide
- `LLM-GUIDE.md` - This file
- `docs/api.md` - API reference
- `docs/SECURITY.md` - Security details
- `VERSION.md` - Changelog

**Testing:**
- `test.js` - Automated API tests
- `react-test/` - React test frontend
- `public/` - HTML test pages

---

## Common Tasks

### 1. Adding a New Endpoint

**Step 1:** Add route in `src/routes/auth.routes.js`
```javascript
router.post('/new-endpoint', validationMiddleware, authController.newHandler);
```

**Step 2:** Add validation in `src/middleware/validator.middleware.js`
```javascript
const newEndpointValidation = [
  body('field').notEmpty().withMessage('Field required'),
  validate
];
```

**Step 3:** Add controller in `src/controllers/auth.controller.js`
```javascript
exports.newHandler = async (req, res) => {
  try {
    const result = await AuthService.newMethod(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
```

**Step 4:** Add service method in `src/services/auth.service.js`
```javascript
async newMethod(data) {
  // Business logic here
  const { data, error } = await supabase.from('table').insert([data]);
  if (error) throw error;
  return data;
}
```

**Step 5:** Update tests in `test.js`

**Step 6:** Update `docs/api.md`

### 2. Modifying Security Config

Edit `src/config/security.config.js`:
```javascript
module.exports = {
  corsWhitelist: [
    'https://yourdomain.com',
    'https://app.yourdomain.com'
  ],
  failedLoginAttempts: {
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000
  },
  jwt: {
    accessTokenExpiry: '1h'
  }
}
```

### 3. Adding Audit Logging

In any controller or service:
```javascript
const auditLogger = require('../utils/audit.logger');

// Log event
await auditLogger.log('EVENT_NAME', {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  details: 'Additional info'
});
```

Critical events auto-save to database.

### 4. Updating Database Schema

1. Create migration file: `migrations/00X_description.sql`
2. Write SQL (include RLS policies)
3. Test in Supabase SQL editor
4. Document in SECURITY.md
5. Update VERSION.md

### 5. Modifying Google OAuth Flow

**Current flow (v1.0.1):**
- Client: `GET /api/v1/auth/google` (no params)
- Server: Redirects to Google with backend callback URL
- Google: Redirects to `/api/v1/auth/google/callback?code=...`
- Server: Exchanges code, creates user, sets cookies, redirects to FRONTEND_URL

**Key points:**
- No client-supplied redirect URL (security)
- Uses FRONTEND_URL from environment
- Signup accepts optional frontendUrl for email verification

**Files involved:**
- `src/services/auth.service.js` - getGoogleAuthUrl(), exchangeGoogleCode()
- `src/controllers/auth.controller.js` - googleAuth(), googleCallback()

---

## Code Patterns

### Error Handling Pattern
```javascript
exports.handler = async (req, res) => {
  try {
    const result = await Service.method();
    res.status(200).json(result);
  } catch (err) {
    // Sanitize error in production
    const message = process.env.NODE_ENV === 'production'
      ? 'Operation failed'
      : err.message;
    res.status(400).json({ error: message });
  }
};
```

### Validation Pattern
```javascript
const validation = [
  body('email')
    .trim()
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Min 8 characters')
    .custom((value) => {
      if (!isStrongPassword(value)) {
        throw new Error('Weak password');
      }
      return true;
    }),
  validate
];
```

### Protected Route Pattern
```javascript
router.delete('/protected', protect, controller.handler);
```
The `protect` middleware verifies JWT from `Authorization: Bearer <token>`.

### Audit Logging Pattern
```javascript
// Log failed login
await loginTracker.recordFailedAttempt(email, ip);

// Log successful auth
await auditLogger.logSuccessfulAuth(userId, email, 'password', ip);

// Log account action
await auditLogger.logAccountDeletion(userId, email, ip);
```

### Service Method Pattern
```javascript
async methodName(param1, param2) {
  // 1. Validate input
  if (!param1) throw new Error('Param required');
  
  // 2. Database operation
  const { data, error } = await supabase
    .from('table')
    .insert([{ param1, param2 }]);
  
  // 3. Handle error
  if (error) throw error;
  
  // 4. Return data
  return data;
}
```

---

## Security Features

### 1. Input Validation
- Location: `src/middleware/validator.middleware.js`
- Library: express-validator
- Validates: email format, password strength, URL protocol

### 2. Failed Login Protection
- Location: `src/utils/login.tracker.js`
- Max attempts: 5
- Lockout duration: 15 minutes
- Storage: In-memory + database (login_attempts table)

### 3. Audit Logging
- Location: `src/utils/audit.logger.js`
- Critical events saved to database (audit_logs table)
- All events logged to console

### 4. Error Sanitization
- Production: Generic error messages only
- Development: Full error details
- No stack traces exposed

### 5. CORS Whitelist
- Location: `src/config/security.config.js`
- Explicit domain list (no regex)
- Localhost allowed in development only

### 6. Secure Cookies
- httpOnly: true (prevents XSS)
- secure: true in production (HTTPS only)
- sameSite: 'strict' in production (CSRF protection)

### 7. HTTP Security Headers
- Helmet middleware
- HSTS with preload
- Content Security Policy

### 8. HTTPS Enforcement
- frontendUrl parameter must be HTTPS
- FRONTEND_URL environment variable must be HTTPS

### 9. OAuth Rollback
- If profile creation fails, user is deleted
- Prevents orphaned records

### 10. Trust Proxy
- Enabled in production
- Accurate IP addresses behind load balancer

---

## Debugging Guide

### Common Issues

**1. "Not allowed by CORS"**
- **Cause:** Origin not in CORS whitelist
- **Solution:** Add origin to corsWhitelist in `src/config/security.config.js`
- **Dev workaround:** Origin with localhost is auto-allowed in development

**2. "Account temporarily locked"**
- **Cause:** 5+ failed login attempts
- **Solution:** Wait 15 minutes or clear login_attempts table
- **Manual clear:** `DELETE FROM login_attempts WHERE email = 'user@example.com'`

**3. "Token failed"**
- **Cause:** JWT expired or invalid
- **Solution:** Sign in again to get fresh token
- **Check:** JWT_SECRET matches between environments

**4. "Email not sending"**
- **Cause:** Invalid BREVO_API_KEY, unverified sender, or Brevo SDK misconfiguration
- **Solution:** Check Brevo dashboard, verify sender email
- **Debug:** Check console logs for Brevo errors

**5. "Database connection failed"**
- **Cause:** Invalid Supabase credentials
- **Solution:** Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
- **Note:** Use SERVICE_ROLE_KEY, not ANON_KEY for backend

**6. "Google OAuth failed"**
- **Cause:** Invalid credentials or wrong redirect URI
- **Solution:** Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- **Verify:** Redirect URI in Google Console matches exactly

### Debugging Tools

**Check server health:**
```bash
curl http://localhost:3000/health
```

**Test signup:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'
```

**Check database:**
- Supabase dashboard > Table Editor
- View audit_logs for security events
- View login_attempts for lockouts

**Check logs:**
- Console output shows all requests (morgan)
- Audit logger outputs to console
- Error details logged in development mode

---

## Testing Guide

### Automated Tests

**Run all tests:**
```bash
npm test
```

**Test email:**
```bash
npm run test:email
```

**Tests cover:**
- Signup with valid/invalid data
- Signin with correct/incorrect credentials
- Protected route (delete account)
- frontendUrl validation (HTTPS only)
- Google OAuth redirect

### Manual Testing

**Option 1: React Frontend (Best)**
```bash
cd react-test
npm install
npm run dev
```
Open http://localhost:3000

**Option 2: HTML Test Pages**
- `public/index.html` - Local testing
- `public/test.html` - Configurable API URL

**Option 3: cURL**
See examples in `docs/api.md`

### Test Scenarios

**1. Complete Auth Flow**
1. Signup user
2. Check email for verification link
3. Signin with credentials
4. Get JWT token
5. Use token for delete-account
6. Verify user deleted

**2. Security Testing**
1. Try 6 failed logins → Account locked
2. Wait 15 minutes → Can login again
3. Invalid password format → Validation error
4. HTTP frontendUrl → Rejected
5. Invalid JWT token → 401 Unauthorized

**3. Google OAuth Flow**
1. Click "Sign in with Google"
2. Complete Google consent
3. Redirected to FRONTEND_URL
4. Cookies set (auth-token, refresh-token)

---

## Deployment Guide

### Pre-Deployment Checklist

**Environment:**
- [ ] NODE_ENV=production
- [ ] Strong JWT_SECRET (256-bit random)
- [ ] FRONTEND_URL set to production domain
- [ ] CORS whitelist updated with production domains

**Database:**
- [ ] Run migrations/001_security_tables.sql
- [ ] Enable Supabase RLS policies
- [ ] Set up database backups

**Security:**
- [ ] SSL/TLS certificates configured
- [ ] Supabase service role key secured
- [ ] Google OAuth redirect URIs updated
- [ ] Brevo sender email verified

**Testing:**
- [ ] Run `npm test` successfully
- [ ] Test all endpoints with production credentials
- [ ] Verify Google OAuth flow
- [ ] Test email delivery

**Monitoring:**
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure log aggregation
- [ ] Set up uptime monitoring
- [ ] Alert on critical audit events

### Deployment Steps

**1. Build (if needed):**
```bash
npm install --production
```

**2. Environment variables:**
Create `.env.production` with production values

**3. Database migration:**
Run SQL in Supabase dashboard

**4. Start server:**
```bash
NODE_ENV=production npm start
```

**5. With PM2 (recommended):**
```bash
pm2 start server.js --name m-auth --env production
pm2 save
pm2 startup
```

**6. Docker (optional):**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Best Practices

### When Modifying Code

1. **Always update version headers** in modified files
2. **Update VERSION.md** with changes
3. **Run tests** before committing: `npm test`
4. **Check for errors:** Review get_errors output
5. **Update documentation** (README, API docs)
6. **Test manually** with React frontend

### Adding Features

1. **Follow existing patterns** (see Code Patterns section)
2. **Add validation** for all inputs
3. **Log security events** with audit logger
4. **Handle errors gracefully** with try-catch
5. **Sanitize errors** in production
6. **Write tests** for new endpoints
7. **Update API documentation**

### Security Guidelines

1. **Never log sensitive data** (passwords, tokens)
2. **Always sanitize user input**
3. **Use parameterized queries** (Supabase handles this)
4. **Validate on server side** (never trust client)
5. **Use HTTPS in production**
6. **Keep dependencies updated**
7. **Review audit logs regularly**

### Database Operations

1. **Use service_role key** for backend operations
2. **Enable RLS policies** in production
3. **Handle errors explicitly**
4. **Use transactions** for multi-table operations
5. **Index frequently queried columns**
6. **Clean up stale data** (old login_attempts)

### Environment Variables

1. **Never commit .env** to git
2. **Use strong random secrets**
3. **Different secrets per environment**
4. **Document required vars** in README
5. **Validate on startup** (check in src/server.js)

---

## Quick Reference

### Environment Variables
```env
PORT=3000
NODE_ENV=development|production
FRONTEND_URL=https://yourdomain.com
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your-256-bit-secret
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
BREVO_API_KEY=xkeysib-xxx
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME="Your Service"
```

### API Endpoints
```
POST   /api/v1/auth/signup           - Register user
POST   /api/v1/auth/signin           - Authenticate
GET    /api/v1/auth/google           - OAuth redirect
GET    /api/v1/auth/google/callback  - OAuth callback
DELETE /api/v1/auth/delete-account   - Delete (protected)
GET    /health                       - Health check
```

### Key Files
```
server.js                         - Entry point
src/server.js                     - Express app
src/services/auth.service.js      - Auth logic
src/controllers/auth.controller.js - HTTP handlers
src/config/security.config.js     - Security settings
src/middleware/validator.middleware.js - Validation
migrations/001_security_tables.sql - Database schema
```

### NPM Commands
```bash
npm start              # Start server
npm test               # Run tests
npm run test:email     # Test email
cd react-test && npm run dev  # React frontend
```

### Database Tables
```
auth.users          - Supabase managed
public.profiles     - User profiles
public.audit_logs   - Security events (v1.0.1)
public.login_attempts - Failed logins (v1.0.1)
```

---

## Version-Specific Notes

### v1.0.1 Changes (Current)
- **Google OAuth simplified:** No frontendUrl parameter needed
- **Server-controlled redirects:** Uses FRONTEND_URL exclusively
- **React test frontend:** New comprehensive test UI
- **Improved security:** Prevents open redirect vulnerabilities

### Important Migration Notes
If updating from v1.0.0:
1. Remove `frontendUrl` parameter from `/google` endpoint calls
2. OAuth now redirects to FRONTEND_URL environment variable
3. Signup still accepts optional frontendUrl for email verification
4. Update any OAuth documentation/client code

---

## Support Resources

**Documentation:**
- [README.md](README.md) - Main documentation
- [QUICK-START.md](QUICK-START.md) - Setup guide
- [docs/api.md](docs/api.md) - API reference
- [docs/SECURITY.md](docs/SECURITY.md) - Security details
- [VERSION.md](VERSION.md) - Changelog

**Testing:**
- [test.js](test.js) - Automated tests
- [react-test/](react-test/) - React frontend
- [public/](public/) - HTML test pages

**Community:**
- Check audit_logs table for security events
- Review console logs for errors
- Test with React frontend for full flow

---

**Last Updated:** February 12, 2026  
**Version:** 1.0.1  
**Maintained by:** Susindran

---

## LLM-Specific Tips

**When helping users:**
1. Always check VERSION.md for current version
2. Reference specific files with line numbers
3. Use multi_replace_string_in_file for batch edits
4. Run get_errors after code changes
5. Update documentation when modifying code
6. Follow existing code patterns
7. Test changes with npm test or React frontend

**Common user requests:**
- "Add new endpoint" → Follow "Adding a New Endpoint" section
- "Fix CORS error" → Update corsWhitelist in security.config.js
- "Change security settings" → Edit security.config.js
- "Add validation" → Update validator.middleware.js
- "Deploy to production" → Follow Deployment Guide section

**Always remember:**
- Security is critical - never bypass validation
- Document all changes in VERSION.md
- Test thoroughly before suggesting deployment
- Sanitize errors in production code
- Keep .env files secure (never expose secrets)
