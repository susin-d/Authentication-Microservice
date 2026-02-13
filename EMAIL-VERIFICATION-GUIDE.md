# 📧 Email Verification & Welcome Email Guide

## Overview

M-Auth now has a **two-step email verification system**:

1. **Verification Email** - Sent immediately after signup with a verification link
2. **Welcome Email** - Sent after user confirms their email and completes verification

---

## 🔄 Complete Flow

### Step 1: User Signs Up
```http
POST /api/v1/auth/signup
```

**What happens:**
- User account created in Supabase
- Profile created with `email_verified: false`
- **Verification email sent** with magic link

**Verification Email Contains:**
- Professional verification button
- Magic link that expires in 24 hours
- Clear instructions
- **Link points to backend:** `http://localhost:3000/api/v1/auth/verify-email?token=...`

---

### Step 2: User Clicks Verification Link

User receives email and clicks the verification link.

**What happens:**
- Backend receives verification token
- Supabase verifies the email
- Profile `email_verified` set to `true`
- **Beautiful HTML success page displayed**
- **Welcome email automatically sent**

**No frontend redirect needed!** User sees a professional success page in their browser.

---

### Step 3: User Signs In
```http
POST /api/v1/auth/signin
```

User can now sign in with their verified email and password.

**What happens:**
- Email is confirmed in Supabase
- Access token generated
- Login successful ✅

---

## 🌐 Backend Verification Page

When user clicks the verification link, they see a beautiful HTML page:

**Features:**
- ✅ Success icon with animation
- Email address confirmation
- Welcome email notification
- "Ready to Sign In" message
- Professional styling with gradient background
- Mobile responsive
- Close button

**Error Handling:**
- If token is invalid: Shows error page
- If token expired: Shows error with clear message
- If already verified: Shows success (idempotent)

---

## 📧 Email Templates

### Verification Email Template (`sendVerificationEmail`)

**Subject:** "Verify Your Email Address 📧"

**Content:**
- Welcome message
- "Verify Email Address" button with the magic link
- Expiration notice (24 hours)
- Safety notice ("ignore if you didn't sign up")

### Welcome Email Template (`sendWelcomeEmail`)

**Subject:** "Welcome to M-Auth! 🚀"

**Content:**
- Personalized greeting with user's name (or email)
- Confirmation that email is verified
- "What's Next" section with suggestions
- "Get Started" call-to-action button
- Footer with copyright

---

## 🎯 Implementation Details

### Backend Changes

#### 1. Email Service (`src/services/email.service.js`)

**Two separate email templates:**
```javascript
sendVerificationEmail(toEmail, verificationLink) {
  // Professional verification email with button
  // Link points to: http://localhost:3000/api/v1/auth/verify-email?token=...
}

sendWelcomeEmail(toEmail, userName) {
  // Welcome email (sent after verification)
  // No verification link needed
}
```

#### 2. Auth Service (`src/services/auth.service.js`)

**Updated signup:**
```javascript
async signUp(email, password) {
  // ...
  // Verification link now points to BACKEND_URL
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  const redirectTo = `${backendUrl}/api/v1/auth/verify-email`;
  // ...
  EmailService.sendVerificationEmail(email, linkData.action_link)
}
```

**New method:**
```javascript
async verifyEmailFromToken(token, type) {
  // 1. Verify token with Supabase
  // 2. Update profile.email_verified = true
  // 3. Send welcome email automatically
}
```

#### 3. New Endpoint (`GET /verify-email`)

**Controller:** `src/controllers/auth.controller.js`
**Route:** `src/routes/auth.routes.js`

```javascript
router.get('/verify-email', authController.verifyEmail);
```

**Features:**
- Accepts `token` query parameter from email link
- Verifies token with Supabase
- Updates profile verification status
- Sends welcome email
- Returns beautiful HTML success page
- Handles errors with styled error page

---

## 💻 No Frontend Changes Needed

The verification is now **completely self-contained** in the backend:

✅ User clicks email link → Backend handles everything
✅ Success page displayed in browser
✅ Welcome email sent automatically
✅ User can sign in immediately

❌ No frontend redirect needed
❌ No JWT token required for verification
❌ No additional API calls needed

---

## 📧 Environment Variables

Add to your `.env`:

```env
# Backend URL for email verification links
BACKEND_URL=http://localhost:3000

# In production, use your domain:
# BACKEND_URL=https://api.yourdomain.com
```

---

## 🧪 Testing Flow

### 1. Add BACKEND_URL to .env
```env
BACKEND_URL=http://localhost:3000
```

### 2. Start Backend Server
```bash
node src/server.js
```

### 3. Test Signup
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

**Check your email inbox** for verification email.

### 4. Click Verification Link

Click the button in the email. You'll see:
- Beautiful success page in your browser
- ✅ "Email Verified Successfully!" message
- Confirmation that welcome email was sent

### 5. Check Welcome Email

Check your inbox again for the welcome email.

### 6. Sign In (Now Works!)
```bash
curl -X POST http://localhost:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

**Success!** You'll receive an access token. ✅

---

## ✅ Verification Checklist

- [ ] Brevo API key configured in `.env`
- [ ] `BREVO_SENDER_EMAIL` and `BREVO_SENDER_NAME` set in `.env`
- [ ] `FRONTEND_URL` configured for email links
- [ ] Backend server restarted with new code
- [ ] Test signup and receive verification email
- [ ] Click verification link and get redirected
- [ ] Sign in to get access token
- [ ] Call complete-verification endpoint
- [ ] Receive welcome email

---

## 🎨 Email Examples

### Verification Email Preview

```
────────────────────────────────────
Verify Your Email Address

Thank you for signing up! Please verify
your email address to activate your account.

┌─────────────────────────────┐
│  Verify Email Address       │
└─────────────────────────────┘

If you didn't create this account, you
can safely ignore this email.

This link will expire in 24 hours.
────────────────────────────────────
```

### Welcome Email Preview

```
────────────────────────────────────
Welcome aboard, John! 🎉

Your email has been verified successfully!

Thank you for joining M-Auth. Your account
is now fully active and ready to use.

┌─────────────────────────────┐
│ What's Next?                │
├─────────────────────────────┤
│ • Complete your profile     │
│ • Explore our features      │
│ • Connect with community    │
└─────────────────────────────┘

If you have any questions, feel free to
reach out to our support team.

┌─────────────────────────────┐
│      Get Started            │
└─────────────────────────────┘

────────────────────────────────────
© 2026 M-Auth. All rights reserved.
────────────────────────────────────
```

---

## 📊 Database Fields

### `profiles` table tracking

```sql
email_verified: boolean
  - false on signup
  - true after complete-verification endpoint called
  
last_login_at: timestamp
  - Updated on signin
  - Updated on signup
```

---

## 🔍 Troubleshooting

### Welcome email not received?

1. **Check verification status:**
```sql
SELECT email_confirmed_at FROM auth.users WHERE email = 'test@example.com';
```

2. **Check profile status:**
```sql
SELECT email_verified FROM profiles WHERE email = 'test@example.com';
```

3. **Check Brevo logs:**
   - Go to Brevo dashboard → Transactional → Logs
   - Check for email delivery status

### "Email is not yet verified" error?

User must click the verification link in their email before calling complete-verification.

### Email link expired?

Generate a new verification link:
```javascript
// Admin can resend verification email
const { data } = await supabase.auth.admin.generateLink({
  type: 'signup',
  email: 'user@example.com'
})
```

---

## 🚀 Next Steps

1. **Customize email templates** in `src/services/email.service.js`
2. **Add email styling** with inline CSS
3. **Configure email sender** in Brevo dashboard
4. **Set up email analytics** in Brevo
5. **Add resend verification** endpoint (optional)

---

**Version:** M-Auth v1.0.2  
**Feature:** Two-step email verification with welcome email  
**Last Updated:** February 12, 2026
