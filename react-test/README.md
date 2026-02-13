# M-Auth React Test Frontend

React-based test interface for M-Auth API v1.0.2

## Features

- ✅ **User Signup** - Test user registration with email verification
- ✅ **User Signin** - Test authentication with JWT token generation
- ✅ **Google OAuth** - Test Google OAuth flow
- ✅ **Get Profile** - Fetch and display complete user profile (NEW v1.0.2)
- ✅ **Update Profile** - Edit profile fields including name, phone, bio, address (NEW v1.0.2)
- ✅ **Delete Account** - Test protected route with JWT authorization
- ✅ **Real-time Response** - View API responses in formatted JSON
- ✅ **Health Check** - Monitor backend server status
- ✅ **Token Management** - Automatically stores and uses access tokens

## Quick Start

### Prerequisites
- Node.js 18+ installed
- M-Auth backend running on `http://localhost:3000`

### Installation

```bash
cd react-test
npm install
```

### Run Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

## Usage

### 1. Sign Up
- Enter email and password
- Password must meet requirements: 8+ chars, uppercase, lowercase, number
- **Check your email** for verification link
- **Click the link** to verify (opens beautiful success page in browser)
- **Welcome email** sent automatically after verification
- Now you can sign in!

### 2. Sign In
- Use credentials from signup
- **Email must be verified first** (check inbox!)
- Access token will be stored automatically
- Token is displayed and used for protected routes

### 3. Google OAuth
- Click "Sign in with Google" button
- Redirects to Google OAuth consent screen
- After authentication, redirects to FRONTEND_URL (from backend environment)

### 4. Get Profile (NEW)
- Requires access token from sign in
- Fetches complete user profile data
- Displays name, phone, bio, address, provider, verification status

### 5. Update Profile (NEW)
- Requires access token from sign in
- Update personal information
- Add or modify address details
- Real-time validation

### 6. Delete Account
- Requires access token from sign in
- Permanently deletes the authenticated user account

## API Configuration

The frontend connects to:
- **Frontend:** `http://localhost:5173` (Vite dev server)
- **Backend API:** `http://localhost:3000/api/v1/auth`
- **Health Check:** `http://localhost:3000/health`

To change the API URL, edit the `apiUrl` state in `src/App.jsx`:

```javascript
const [apiUrl] = useState('http://localhost:3000/api/v1/auth')
```

## Features Tested

### Signup Endpoint
- Email validation
- Password strength validation
- Optional HTTPS frontendUrl validation
- Error handling for duplicate emails

### Signin Endpoint
- Email/password authentication
- JWT token generation
- Failed login tracking (5 attempts max)
- Account lockout after max attempts

### Google OAuth
- OAuth redirect flow
- Server-controlled callback URL
- Cookie-based session management

### Delete Account
- JWT token authorization
- Protected route access
- Account deletion confirmation

## Response Display

All API responses are displayed in a formatted JSON viewer with:
- ✅ Success responses (green border)
- ❌ Error responses (red border)
- ℹ️ Info messages (blue border)
- Timestamps for each request

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Axios** - HTTP client with cookie support
- **Modern CSS** - Responsive design with grid layout

## Project Structure

```
react-test/
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── package.json         # Dependencies
└── README.md           # This file
```

## Development

### Hot Module Replacement
Vite provides instant HMR - changes appear immediately without page reload.

### Proxy Configuration
The dev server proxies `/api` requests to `http://localhost:3000` to avoid CORS issues during development.

### Cookie Support
`axios.defaults.withCredentials = true` ensures cookies are sent with requests for OAuth flows.

## Troubleshooting

**Server Status shows Offline:**
- Ensure M-Auth backend is running on port 3000
- Check `npm start` in the main project directory

**CORS Errors:**
- Backend must include `http://localhost:3000` in CORS whitelist for development
- Check `src/config/security.config.js` in backend

**Google OAuth Fails:**
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in backend `.env`
- Verify `http://localhost:3000/api/v1/auth/google/callback` is in Google OAuth redirect URIs

**Token Not Working:**
- Sign in again to get a fresh token
- Tokens expire after 1 hour (configurable in backend)

## Production Deployment

1. Build the frontend:
```bash
npm run build
```

2. Serve the `dist` folder using any static file server:
```bash
npm run preview
```

3. Update API URL in production to point to your deployed backend.

## License

ISC - Part of M-Auth microservice project
