# Database Schema Documentation

**Version:** 1.0.2  
**Last Updated:** February 12, 2026

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Password Storage](#password-storage)
3. [Tables Structure](#tables-structure)
4. [Migrations](#migrations)
5. [Security Policies](#security-policies)

---

## Overview

M-Auth uses **Supabase (PostgreSQL)** with two main schemas:
- **`auth`** schema - Managed by Supabase for authentication
- **`public`** schema - Custom tables for profiles and security features

---

## Password Storage

### ⚠️ IMPORTANT: Where Passwords Are Stored

**Passwords ARE NOT stored in the `profiles` table!**

Passwords are securely managed by Supabase:
- **Table:** `auth.users` (Supabase-managed)
- **Column:** `encrypted_password`
- **Algorithm:** bcrypt with salt
- **Access:** Service role ONLY (never exposed to clients)

### Viewing Password Metadata
```sql
-- Run this in Supabase SQL Editor to see auth metadata
SELECT 
  id, 
  email, 
  encrypted_password IS NOT NULL as has_password,
  email_confirmed_at IS NOT NULL as email_verified,
  last_sign_in_at,
  created_at,
  raw_app_meta_data->>'provider' as auth_provider
FROM auth.users;
```

**What you'll see:**
- `has_password: true` - User has a password set
- `email_verified: true/false` - Email confirmation status
- `auth_provider` - How they signed up (email, google, etc)

---

## Tables Structure

### 1. `auth.users` (Supabase-Managed)

**Purpose:** Core authentication data

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (UUID) |
| email | text | User email |
| encrypted_password | text | **Bcrypt hashed password** |
| email_confirmed_at | timestamptz | Email verification time |
| last_sign_in_at | timestamptz | Last login timestamp |
| created_at | timestamptz | Account creation time |
| raw_app_meta_data | jsonb | Provider info (google, password) |
| raw_user_meta_data | jsonb | Custom user metadata |

**🔒 Security:** Only accessible via service_role key (backend only)

---

### 2. `public.profiles` (Custom)

**Purpose:** Additional user profile information

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (matches auth.users.id) |
| email | text | User email (synced from auth) |
| full_name | text | User's full name |
| phone_number | text | Phone number |
| avatar_url | text | Profile picture URL |
| date_of_birth | date | Date of birth |
| address | jsonb | Address object |
| bio | text | User biography |
| provider | text | Auth provider (password/google) |
| email_verified | boolean | Verification status |
| last_login_at | timestamptz | Last login time |
| created_at | timestamptz | Profile creation time |
| updated_at | timestamptz | Last update time |

**Example address JSON:**
```json
{
  "street": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zip": "94102",
  "country": "USA"
}
```

**🔒 Security:** RLS enabled - users can only view/update their own profile

---

### 3. `public.audit_logs` (Security)

**Purpose:** Track security events and user actions

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| event | text | Event type (LOGIN_SUCCESS, SIGNUP, etc) |
| data | jsonb | Event details |
| timestamp | timestamptz | When it happened |
| ip_address | text | User's IP address |
| user_id | uuid | User ID (if authenticated) |
| created_at | timestamptz | Record creation time |

**Common events:**
- `SIGNUP` - New user registration
- `LOGIN_SUCCESS` - Successful login
- `LOGIN_FAILED` - Failed login attempt
- `OAUTH_SUCCESS` - OAuth authentication
- `ACCOUNT_DELETED` - Account deletion

**🔒 Security:** Service role only (RLS enabled)

---

### 4. `public.login_attempts` (Security)

**Purpose:** Track failed login attempts for brute force protection

| Column | Type | Description |
|--------|------|-------------|
| email | text | Primary key (email address) |
| attempts | integer | Failed attempt count |
| first_attempt | timestamptz | First failed attempt time |
| last_attempt | timestamptz | Most recent attempt |
| locked_until | timestamptz | Account lockout expiration |
| ip_address | text | IP address of attempts |
| updated_at | timestamptz | Last update time |

**Lockout rules:**
- Max 5 failed attempts
- 15-minute lockout duration
- Resets after successful login

**🔒 Security:** Service role only (RLS enabled)

---

## Migrations

### Migration Files

1. **`001_security_tables.sql`** - Creates audit_logs, login_attempts, initial profile fields
2. **`002_enhanced_profiles.sql`** - Adds comprehensive profile fields, RLS policies, triggers

### How to Run Migrations

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy migration file contents
4. Click "Run"
5. Verify tables in Table Editor

### Verification Queries

**Check if tables exist:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'audit_logs', 'login_attempts');
```

**Check profile columns:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
```

**View RLS policies:**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('profiles', 'audit_logs', 'login_attempts');
```

---

## Security Policies

### Row Level Security (RLS)

All tables have RLS enabled with specific policies:

#### Profiles Table
```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Service role has full access
CREATE POLICY "Service role full access to profiles"
  ON profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

#### Audit Logs & Login Attempts
```sql
-- Service role ONLY (no user access)
CREATE POLICY "Service role can do everything"
  ON audit_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

### Access Levels

| Role | auth.users | profiles | audit_logs | login_attempts |
|------|------------|----------|------------|----------------|
| anon | ❌ | ❌ | ❌ | ❌ |
| authenticated | ❌ | Own only | ❌ | ❌ |
| service_role | ✅ Full | ✅ Full | ✅ Full | ✅ Full |

---

## Common Queries

### Get Complete User Info
```sql
SELECT 
  p.*,
  u.email_confirmed_at IS NOT NULL as email_verified_at_auth,
  u.last_sign_in_at,
  u.created_at as auth_created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.email = 'user@example.com';
```

### Get User with Password Status
```sql
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.provider,
  u.encrypted_password IS NOT NULL as has_password,
  u.email_confirmed_at IS NOT NULL as email_verified
FROM profiles p
JOIN auth.users u ON p.id = u.id;
```

### View Recent Security Events
```sql
SELECT 
  event,
  data->>'email' as email,
  ip_address,
  timestamp
FROM audit_logs
WHERE event IN ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'SIGNUP')
ORDER BY timestamp DESC
LIMIT 20;
```

### Check Locked Accounts
```sql
SELECT 
  email,
  attempts,
  locked_until,
  EXTRACT(EPOCH FROM (locked_until - NOW())) / 60 as minutes_remaining
FROM login_attempts
WHERE locked_until > NOW()
ORDER BY locked_until DESC;
```

### Update User Profile
```sql
UPDATE profiles
SET 
  full_name = 'John Doe',
  phone_number = '+1-555-0123',
  address = '{"street": "123 Main St", "city": "SF", "state": "CA"}',
  updated_at = NOW()
WHERE id = 'user-uuid-here';
```

---

## Backup Recommendations

### What to Backup

1. **`profiles`** - User profile data
2. **`audit_logs`** - Security audit trail
3. **`login_attempts`** - Login tracking (optional, can be cleared periodically)

**Note:** `auth.users` is automatically backed up by Supabase

### Backup Schedule

- **Daily:** profiles table
- **Weekly:** audit_logs
- **Monthly:** Full database export

### Export Example
```sql
-- Export profiles to CSV
COPY (
  SELECT * FROM profiles
) TO '/tmp/profiles_backup.csv' WITH CSV HEADER;
```

---

## Maintenance

### Cleanup Old Data

**Old login attempts (30+ days):**
```sql
DELETE FROM login_attempts 
WHERE last_attempt < NOW() - INTERVAL '30 days';
```

**Old audit logs (90+ days):**
```sql
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '90 days';
```

**Orphaned profiles (user deleted from auth.users):**
```sql
DELETE FROM profiles 
WHERE id NOT IN (SELECT id FROM auth.users);
```

---

## Troubleshooting

### Can't Access Profiles Table

**Problem:** RLS blocking queries  
**Solution:** Use service_role key in backend, or query as authenticated user

### Password Appears Null

**Problem:** Looking in wrong table  
**Solution:** Passwords are in `auth.users.encrypted_password`, not `profiles`

### Can't Update Profile

**Problem:** RLS policy blocking update  
**Solution:** Ensure user is authenticated and updating their own record

---

**For more information:**
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [SECURITY.md](SECURITY.md) - M-Auth security features
