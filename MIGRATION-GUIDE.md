# Migration Guide: Supabase Auth → Custom Users Table

## 🎯 What Changed

M-Auth v2.0.0 now uses a **custom `users` table** instead of Supabase's built-in authentication system (GoTrue). This gives you full control over user data and authentication logic.

## 🗝️ Key Differences

### Before (v1.x - Supabase Auth)
- **Two separate systems**:
  1. Supabase Auth (`auth.users`) - Stored credentials, handled auth
  2. `profiles` table - Stored additional user data
- Passwords managed by Supabase
- Limited customization of auth flow
- Email verification via Supabase tokens

### After (v2.0 - Custom Table)
- **Single unified `users` table**:
  - All authentication data (email, password_hash, verification)
  - All profile data (name, avatar, bio, etc.)
- Passwords hashed with bcrypt (12 rounds)
- Full control over authentication logic
- Custom verification tokens that you manage

## 📋 Migration Steps

### 1. Run the Migration SQL

Open your Supabase Dashboard → SQL Editor and run:

```bash
# Copy the migration file
migrations/003_custom_users_table.sql
```

This will:
- ✅ Create the new `users` table with all fields
- ✅ Migrate existing data from `profiles` table (if exists)
- ✅ Set up indexes, RLS policies, and triggers
- ⚠️  Set password_hash = 'MIGRATION_REQUIRED' for existing users

**Note:** You can optionally drop the old `profiles` table after migration by uncommenting the DROP TABLE line in the migration.

### 2. Handle Existing Users

Existing users will have `password_hash = 'MIGRATION_REQUIRED'` and **cannot sign in** until they:

**Option A: Delete and Re-signup** (Recommended for development)
```bash
# Run this script to delete a user
node scripts/delete-auth-user.js susindransd@gmail.com

# User can now signup fresh with new password
```

**Option B: Implement Password Reset** (For production)
- Users click "Forgot Password"
- Receive reset link via email
- Set new password
- Can now sign in normally

### 3. Delete Old Supabase Auth Users

The migration only handles the database table. Supabase Auth users might still exist:

**Via Dashboard:**
1. Go to Supabase Dashboard → Authentication → Users
2. Delete all users manually

**Via Script:**
```bash
node scripts/delete-auth-user.js email@example.com
```

### 4. Update Environment Variables

No changes needed - your `.env` file already has everything:
```env
BACKEND_URL=http://localhost:3000  ✅
JWT_SECRET=your_secret             ✅
SUPABASE_URL=...                    ✅
SUPABASE_SERVICE_ROLE_KEY=...      ✅
```

### 5. Install Dependencies

```bash
npm install  # bcrypt is already in package.json
```

### 6. Restart Backend Server

```bash
node src/server.js
```

## 🔄 New Authentication Flow

### Signup Flow
```
1. User submits email + password
2. Backend hashes password with bcrypt (SALT_ROUNDS=12)
3. Generates random verification token (64 hex chars)
4. Inserts into users table with email_verified=false
5. Sends verification email with token link
6. User clicks link → Backend marks email_verified=true
7. Sends welcome email
```

### Signin Flow
```
1. User submits email + password
2. Backend queries users table by email
3. Checks account_status='active'
4. Verifies email_verified=true
5. Compares password with bcrypt.compare()
6. Updates last_signin_at timestamp
7. Generates JWT token with user ID
8. Returns token + user data
```

### Google OAuth Flow
```
1. User clicks "Sign in with Google"
2. Redirected to Google for authorization
3. Google returns to callback with code
4. Exchange code for Google access token
5. Get user info from Google (email, name, picture)
6. Check if user exists in users table by email
   - If exists: Update google_id and last_signin_at
   - If new: Insert with provider='google', email_verified=true, password_hash='GOOGLE_OAUTH'
7. Generate JWT token
8. Redirect to frontend with token cookie
```

## 🗃️ Database Schema

### Users Table Structure
```sql
users (
  -- Authentication
  id                              UUID PRIMARY KEY
  email                           TEXT UNIQUE NOT NULL
  password_hash                   TEXT NOT NULL
  email_verified                  BOOLEAN DEFAULT FALSE
  email_verified_at               TIMESTAMPTZ
  
  -- Verification Tokens
  verification_token              TEXT
  verification_token_expires_at   TIMESTAMPTZ
  reset_token                     TEXT
  reset_token_expires_at          TIMESTAMPTZ
  
  -- Profile Fields
  full_name                       TEXT
  display_name                    TEXT
  avatar_url                      TEXT
  bio                             TEXT
  date_of_birth                   DATE
  gender                          TEXT
  phone_number                    TEXT
  country                         TEXT
  city                            TEXT
  website_url                     TEXT
  
  -- OAuth
  google_id                       TEXT UNIQUE
  provider                        TEXT DEFAULT 'email'
  
  -- Account Status
  account_status                  TEXT DEFAULT 'active'
  suspended_at                    TIMESTAMPTZ
  suspended_reason                TEXT
  deleted_at                      TIMESTAMPTZ
  
  -- Timestamps
  created_at                      TIMESTAMPTZ DEFAULT NOW()
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
  last_signin_at                  TIMESTAMPTZ
)
```

## 🔒 Security Features

### Password Hashing
- **Algorithm:** bcrypt
- **Rounds:** 12 (very secure, ~250ms per hash)
- **Storage:** 60-character hash in `password_hash` column

### Token Security
- **Verification tokens:** 64 hex chars (256-bit entropy)
- **Expiry:** 24 hours for email verification, 1 hour for password reset
- **One-time use:** Cleared from database after use

### Account Status
- `active` - Normal functioning account
- `suspended` - Temporarily blocked (future feature)
- `deleted` - Soft deleted (can be restored)

## 📝 API Changes

### Signup Response
**Before:**
```json
{
  "user": {
    "id": "...",
    "email": "...",
    "email_confirmed_at": null,
    "user_metadata": {}
  }
}
```

**After:**
```json
{
  "user": {
    "id": "...",
    "email": "...",
    "created_at": "2026-02-12T..."
  }
}
```

### Signin Response
**Before:**
```json
{
  "user": { ... },
  "access_token": "...",
  "refresh_token": "..."
}
```

**After:**
```json
{
  "user": {
    "id": "...",
    "email": "...",
    "full_name": "...",
    "email_verified": true,
    ...
  },
  "access_token": "..."
}
```
**Note:** No `refresh_token` for email/password auth (only for Google OAuth).

### Profile Data
- ✅ All profile fields now in the same `user` object
- ✅ No need for separate `/profile` endpoint (but still exists for compatibility)
- ✅ Sensitive fields automatically excluded: `password_hash`, `verification_token`, `reset_token`

## 🧪 Testing the Migration

### 1. Test Fresh Signup
```bash
POST /api/v1/auth/signup
{
  "email": "test@example.com",
  "password": "SecurePass123!"
}

# Expected: Success, verification email sent
# Check: users table has new row with email_verified=false
```

### 2. Test Email Verification
```bash
# Click link in email or test directly:
GET /api/v1/auth/verify-email?token=abc123...

# Expected: Beautiful HTML success page
# Check: users table shows email_verified=true, verification_token=null
```

### 3. Test Signin
```bash
POST /api/v1/auth/signin
{
  "email": "test@example.com",
  "password": "SecurePass123!"
}

# Expected: JWT token + user object
# Check: users table shows updated last_signin_at
```

### 4. Test Duplicate Email
```bash
POST /api/v1/auth/signup
{
  "email": "test@example.com",  # Already exists
  "password": "AnotherPass456!"
}

# Expected: 422 error
# Message: "This email is already registered. Please sign in or use a different email."
```

### 5. Test Google OAuth
```bash
GET /api/v1/auth/google

# Expected: Redirect to Google
# After approval: New user in users table with provider='google'
```

## 🚨 Troubleshooting

### "A user with this email address has already been registered"
**Cause:** User exists in Supabase Auth system (not just database)

**Solution:**
```bash
# Delete from Supabase Auth
node scripts/delete-auth-user.js email@example.com

# Or delete via dashboard:
# Supabase → Authentication → Users → Delete
```

### "Email not verified" on signin
**Cause:** User clicked signup but didn't verify email

**Solution:**
```sql
-- Manually verify for testing:
UPDATE users SET email_verified = true WHERE email = 'test@example.com';
```

### Old users can't sign in
**Cause:** Migration set password_hash = 'MIGRATION_REQUIRED'

**Solution:**
- Delete users and have them re-signup
- Or implement password reset flow (see auth.service.js methods)

### RLS policies blocking access
**Cause:** Row Level Security might need service role bypass

**Solution:**
Backend uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS automatically.

## 🎯 Benefits of Migration

### ✅ Pros
- **Full control:** Customize auth logic however you want
- **Single table:** No sync issues between auth.users and profiles
- **Better errors:** Custom error messages for every scenario
- **Flexibility:** Add any fields to users table
- **Cost:** No dependency on Supabase Auth pricing
- **Debugging:** Direct database queries for troubleshooting
- **Soft deletes:** Mark users as deleted instead of removing

### ⚠️ Cons
- **More responsibility:** You manage password security
- **Token management:** Handle verification/reset tokens yourself
- **No built-in features:** Email verification, password reset need custom code

## 📚 Code References

**Key Files:**
- [auth.service.js](src/services/auth.service.js) - v2.0.0 - Core auth logic with bcrypt
- [003_custom_users_table.sql](migrations/003_custom_users_table.sql) - Migration SQL
- [delete-auth-user.js](scripts/delete-auth-user.js) - Cleanup script
- [auth.controller.js](src/controllers/auth.controller.js) - API endpoints (no changes needed)
- [auth.middleware.js](src/middleware/auth.middleware.js) - JWT verification (no changes needed)

## 🎉 Migration Complete!

Once you've completed these steps:
1. ✅ Ran migration SQL in Supabase
2. ✅ Deleted old Supabase Auth users
3. ✅ Installed dependencies (bcrypt)
4. ✅ Restarted backend server
5. ✅ Tested signup → verify → signin flow

Your M-Auth system is now running on **custom authentication**! 🚀

---

**Questions?** Check the comprehensive error messages in the API responses or review the code comments in `auth.service.js`.
