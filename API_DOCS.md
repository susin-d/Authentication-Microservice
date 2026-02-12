# Stellar Auth Service API Documentation

Welcome to the Stellar Auth Service API. This service handles user authentication, session management, and account recovery for the Stellar platform.

## Base URL
`http://localhost:3000` (Development)
`https://auth.susindran.in` (Production)

---

## Authentication Endpoints

### 1. Sign Up
Create a new user account.

- **URL**: `/api/auth/signup`
- **Method**: `POST`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "name": "John Doe"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Signup successful. Please check your email to verify your account.",
    "data": {
      "user": { "id": "uuid", "email": "user@example.com", "name": "John Doe", "verified": false },
      "token": "jwt_access_token",
      "refresh_token": "jwt_refresh_token"
    }
  }
  ```

### 2. Sign In
Authenticate an existing user.

- **URL**: `/api/auth/signin`
- **Method**: `POST`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Sign in successful",
    "data": {
      "user": { "id": "uuid", "email": "user@example.com", "name": "John Doe", "verified": true },
      "token": "jwt_access_token",
      "jwt_refresh_token": "jwt_refresh_token"
    }
  }
  ```

### 3. Sign Out
Invalidate the current user session (Handled client-side by purging tokens).

- **URL**: `/api/auth/signout`
- **Method**: `POST`
- **Access**: Private (Requires Bearer Token)
- **Headers**: `Authorization: Bearer <token>`
- **Success Response (200 OK)**:
  ```json
  { "success": true, "message": "Sign out successful" }
  ```

### 4. Delete Account
Permanently delete the current user's account and all associated data.

- **URL**: `/api/auth/delete-account`
- **Method**: `DELETE`
- **Access**: Private (Requires Bearer Token)
- **Headers**: `Authorization: Bearer <token>`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Account deleted successfully"
  }
  ```
- **Error Response (404 Not Found)**:
  ```json
  {
    "success": false,
    "message": "User not found or already deleted"
  }
  ```

---

## Session & Token Management

### 5. Get Current Session
Retrieve user details using an access token.

- **URL**: `/api/auth/session`
- **Method**: `POST`
- **Access**: Private (Requires Bearer Token)
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  { "access_token": "jwt_access_token" }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "uuid", "email": "user@example.com", "name": "John Doe", "verified": true }
    }
  }
  ```

### 6. Refresh JWT Token
Obtain a new access token using a refresh token.

- **URL**: `/api/auth/refresh-jwt`
- **Method**: `POST`
- **Access**: Public
- **Request Body**:
  ```json
  { "jwt_refresh_token": "your_refresh_token" }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "JWT token refreshed successfully",
    "data": {
      "token": "new_access_token",
      "refresh_token": "new_refresh_token"
    }
  }
  ```

---

## Account Recovery & Verification

### 7. Verify Email
Verify a user account using the token sent to their email.

- **URL**: `/api/auth/verify-email`
- **Method**: `POST`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "verificationToken": "email_token_string"
  }
  ```

### 8. Reset Password Request
Send a password reset link to the user's email.

- **URL**: `/api/auth/reset-password`
- **Method**: `POST`
- **Access**: Public
- **Request Body**:
  ```json
  { "email": "user@example.com" }
  ```

### 9. Confirm Password Reset
Set a new password using a reset token.

- **URL**: `/api/auth/reset-password/confirm`
- **Method**: `POST`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "resetToken": "reset_token_string",
    "newPassword": "NewStrongPassword123!"
  }
  ```

---

## OAuth Endpoints

### 10. Google Sign-In (Initiate)
Generate the Google OAuth URL.

- **URL**: `/api/auth/google`
- **Method**: `POST`
- **Access**: Public
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": { "url": "https://accounts.google.com/...", "state": "unique_state" }
  }
  ```

---

## Error Codes

| Status Code | Description |
| :--- | :--- |
| `400` | Bad Request (Missing fields, invalid format) |
| `401` | Unauthorized (Invalid token, wrong credentials) |
| `403` | Forbidden (Insufficient permissions) |
| `429` | Too Many Requests (Rate limit hit - currently disabled in production) |
| `500` | Internal Server Error (Database or SMTP failure) |
