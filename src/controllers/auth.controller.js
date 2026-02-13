/**
 * Auth Controller - v1.0.2
 * HTTP request handlers for authentication endpoints
 */

const AuthService = require('../services/auth.service');
const loginTracker = require('../utils/login.tracker');
const auditLogger = require('../utils/audit.logger');
const securityConfig = require('../config/security.config');

exports.register = async (req, res) => {
  try {
    const user = await AuthService.signUp(
      req.body.email,
      req.body.password,
      req.body.frontendUrl
    );
    res.status(201).json({ message: "User created", user_id: user.id });
  } catch (err) {
    // Log the actual error for debugging
    console.error('Signup error:', err);
    
    // Parse Supabase error messages
    let errorMessage = 'Registration failed';
    let statusCode = 400;
    
    if (err.message) {
      const msg = err.message.toLowerCase();
      
      // User already exists errors
      if (msg.includes('already registered') || 
          msg.includes('already exists') || 
          msg.includes('user already registered') ||
          msg.includes('duplicate key') ||
          err.code === '23505') { // PostgreSQL unique violation
        errorMessage = 'This email is already registered. Please sign in or use a different email.';
      }
      // Email format errors
      else if (msg.includes('invalid email') || msg.includes('email format')) {
        errorMessage = 'Invalid email format. Please provide a valid email address.';
      }
      // Password strength errors
      else if (msg.includes('password') && (msg.includes('weak') || msg.includes('short') || msg.includes('requirements'))) {
        errorMessage = 'Password must be at least 8 characters with uppercase, lowercase, and numbers.';
      }
      // Rate limiting
      else if (msg.includes('rate limit') || msg.includes('too many')) {
        errorMessage = 'Too many requests. Please try again in a few minutes.';
        statusCode = 429;
      }
      // Generic error with the actual message
      else if (err.message.length < 200) {
        errorMessage = err.message;
      }
    }
    
    await auditLogger.log('SIGNUP_FAILED', {
      email: req.body.email,
      error: err.message,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    // Check if account is locked
    const lockStatus = await loginTracker.isLocked(email);
    if (lockStatus.locked) {
      return res.status(429).json({ 
        error: 'Account temporarily locked',
        remainingMinutes: lockStatus.remainingMinutes
      });
    }

    try {
      const result = await AuthService.signIn(email, password);
      
      // Clear failed attempts on successful login
      await loginTracker.clearAttempts(email);
      await auditLogger.logSuccessfulAuth(result.user.id, email, 'password', ip);
      
      res.status(200).json(result);
    } catch (authError) {
      // Record failed attempt
      const attemptData = await loginTracker.recordFailedAttempt(email, ip);
      
      if (attemptData.lockedUntil) {
        return res.status(429).json({ 
          error: 'Too many failed attempts. Account locked temporarily',
          remainingMinutes: Math.ceil((attemptData.lockedUntil - Date.now()) / 1000 / 60)
        });
      }
      
      // Log failed login
      await auditLogger.log('LOGIN_FAILED', {
        email,
        ip,
        timestamp: new Date().toISOString()
      });
      
      // Return specific error message from auth service
      res.status(401).json({ 
        error: authError.message || 'Invalid email or password' 
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication service error. Please try again.' });
  }
};

exports.removeAccount = async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    await AuthService.deleteAccount(req.user.sub);
    await auditLogger.logAccountDeletion(req.user.sub, req.user.email, ip);
    res.status(200).json({ 
      message: "Account deleted successfully",
      success: true
    });
  } catch (err) {
    console.error('Delete account error:', err);
    
    let errorMessage = 'Failed to delete account. Please try again.';
    let statusCode = 500;
    
    if (err.message) {
      const msg = err.message.toLowerCase();
      
      if (msg.includes('not found') || msg.includes('does not exist')) {
        errorMessage = 'Account not found or already deleted.';
        statusCode = 404;
      } else if (msg.includes('permission') || msg.includes('unauthorized')) {
        errorMessage = 'You do not have permission to delete this account.';
        statusCode = 403;
      } else if (err.message.length < 200) {
        errorMessage = err.message;
      }
    }
    
    await auditLogger.log('ACCOUNT_DELETION_FAILED', {
      userId: req.user.sub,
      error: err.message,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const profile = await AuthService.getProfile(req.user.sub);
    
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found. Please contact support.' 
      });
    }
    
    res.status(200).json(profile);
  } catch (err) {
    console.error('Get profile error:', err);
    
    let errorMessage = 'Failed to retrieve profile.';
    let statusCode = 500;
    
    if (err.message) {
      const msg = err.message.toLowerCase();
      
      if (msg.includes('not found') || msg.includes('does not exist')) {
        errorMessage = 'Profile not found. Your account may not be fully set up.';
        statusCode = 404;
      } else if (msg.includes('permission') || msg.includes('unauthorized')) {
        errorMessage = 'You do not have permission to view this profile.';
        statusCode = 403;
      } else if (err.message.length < 200) {
        errorMessage = err.message;
      }
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ 
        error: 'No updates provided. Please include fields to update.' 
      });
    }
    
    const profile = await AuthService.updateProfile(req.user.sub, updates);
    
    res.status(200).json({ 
      message: "Profile updated successfully", 
      profile,
      success: true
    });
  } catch (err) {
    console.error('Update profile error:', err);
    
    let errorMessage = 'Failed to update profile.';
    let statusCode = 400;
    
    if (err.message) {
      const msg = err.message.toLowerCase();
      
      if (msg.includes('not found') || msg.includes('does not exist')) {
        errorMessage = 'Profile not found. Cannot update non-existent profile.';
        statusCode = 404;
      } else if (msg.includes('validation') || msg.includes('invalid')) {
        errorMessage = err.message; // Use the validation error message directly
      } else if (msg.includes('permission') || msg.includes('unauthorized') || msg.includes('not allowed')) {
        errorMessage = err.message;
        statusCode = 403;
      } else if (msg.includes('duplicate') || msg.includes('unique')) {
        errorMessage = 'This value is already in use by another account.';
        statusCode = 409;
      } else if (err.message.length < 200) {
        errorMessage = err.message;
      }
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    // Force HTTPS for production domain
    const host = req.get('host');
    const protocol = (host.includes('susindran.in') || process.env.NODE_ENV === 'production') ? 'https' : req.protocol;
    const origin = `${protocol}://${host}`;
    const frontendUrl = req.query.frontend_url;
    const authUrl = await AuthService.getGoogleAuthUrl(origin, frontendUrl);
    res.redirect(authUrl);
  } catch (err) {
    console.error('Google Auth initiation error:', err);
    
    let errorMessage = 'Failed to initiate Google authentication. Please try again.';
    
    if (err.message) {
      const msg = err.message.toLowerCase();
      
      if (msg.includes('client id') || msg.includes('client_id')) {
        errorMessage = 'Google OAuth is not configured properly. Please contact support.';
      } else if (msg.includes('redirect') || msg.includes('callback')) {
        errorMessage = 'OAuth redirect configuration error. Please contact support.';
      } else if (err.message.length < 200) {
        errorMessage = err.message;
      }
    }
    
    await auditLogger.log('GOOGLE_AUTH_INIT_FAILED', {
      error: err.message,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'Missing OAuth code' });
    }

    // Decode frontend_url from state parameter
    let frontendUrl = null;
    if (state) {
      try {
        frontendUrl = Buffer.from(state, 'base64').toString('utf-8');
      } catch (err) {
        console.error('Failed to decode state parameter:', err);
      }
    }

    // Force HTTPS for production domain
    const host = req.get('host');
    const protocol = (host.includes('susindran.in') || process.env.NODE_ENV === 'production') ? 'https' : req.protocol;
    const origin = `${protocol}://${host}`;
    const session = await AuthService.exchangeGoogleCode(code, origin);
    const redirectTo = AuthService.buildFrontendRedirect(frontendUrl);

    // Set cookies using security config
    res.cookie('auth-token', session.access_token, {
      ...securityConfig.cookie,
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    if (session.refresh_token) {
      res.cookie('refresh-token', session.refresh_token, {
        ...securityConfig.cookie,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }

    return res.redirect(redirectTo);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    
    let errorMessage = 'Google authentication failed. Please try again.';
    let statusCode = 400;
    
    if (err.message) {
      const msg = err.message.toLowerCase();
      
      if (msg.includes('invalid') && msg.includes('code')) {
        errorMessage = 'Invalid or expired authorization code. Please try signing in again.';
      } else if (msg.includes('access denied') || msg.includes('user denied')) {
        errorMessage = 'You denied access to your Google account. Please try again and allow access.';
      } else if (msg.includes('already exists') || msg.includes('already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
        statusCode = 409;
      } else if (msg.includes('token')) {
        errorMessage = 'Failed to exchange authorization code. Please try again.';
      } else if (err.message.length < 200) {
        errorMessage = err.message;
      }
    }
    
    await auditLogger.log('GOOGLE_OAUTH_FAILED', {
      error: err.message,
      ip: req.ip || req.connection.remoteAddress
    });
    
    return res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token, type } = req.query;
    
    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Verification Error</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; }
            .error { color: #dc3545; font-size: 64px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">❌</div>
            <h1>Verification Failed</h1>
            <p>Invalid or missing verification token. Please check your email and click the verification link again.</p>
          </div>
        </body>
        </html>
      `);
    }

    const result = await AuthService.verifyEmailFromToken(token, type);
    
    await auditLogger.log('EMAIL_VERIFIED', {
      email: result.email,
      ip: req.ip || req.connection.remoteAddress
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verified Successfully!</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .container { 
            background: white; 
            padding: 50px 40px; 
            border-radius: 15px; 
            box-shadow: 0 10px 40px rgba(0,0,0,0.2); 
            text-align: center; 
            max-width: 500px;
            width: 100%;
            animation: slideUp 0.5s ease-out;
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .success-icon { 
            font-size: 80px; 
            margin-bottom: 20px;
            animation: bounce 0.6s ease-in-out;
          }
          @keyframes bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          h1 { 
            color: #2d3748; 
            margin-bottom: 15px;
            font-size: 28px;
            font-weight: 600;
          }
          .email { 
            color: #4a5568; 
            font-size: 16px;
            margin-bottom: 20px;
            font-weight: 500;
          }
          p { 
            color: #718096; 
            line-height: 1.6; 
            margin-bottom: 30px;
            font-size: 15px;
          }
          .info-box {
            background: #f7fafc;
            border-left: 4px solid #48bb78;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            border-radius: 5px;
          }
          .info-box strong { 
            color: #2d3748; 
            display: block;
            margin-bottom: 5px;
          }
          .info-box p { 
            margin: 0;
            font-size: 14px;
          }
          .close-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
            font-weight: 600;
          }
          .close-btn:hover {
            background: #5568d3;
          }
          .footer {
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #a0aec0;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>Email Verified Successfully!</h1>
          <p class="email">${result.email}</p>
          <p>Your email has been verified. You can now sign in to your account and access all features.</p>
          
          <div class="info-box">
            <strong>🎉 Welcome Email Sent!</strong>
            <p>Check your inbox for a welcome message with next steps.</p>
          </div>

          <div class="info-box">
            <strong>🔐 Ready to Sign In</strong>
            <p>Use your email and password to access your account.</p>
          </div>
          
          <button class="close-btn" onclick="window.close()">Close Window</button>
          
          <div class="footer">
            © 2026 M-Auth • Secure Authentication Service
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    await auditLogger.log('EMAIL_VERIFICATION_FAILED', {
      error: err.message,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
          .container { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 500px; width: 100%; }
          .error { color: #dc3545; font-size: 64px; margin-bottom: 20px; }
          h1 { color: #333; margin-bottom: 15px; font-size: 24px; }
          p { color: #666; line-height: 1.6; margin-bottom: 20px; }
          .error-details { background: #fff5f5; border-left: 4px solid #fc8181; padding: 15px; margin: 20px 0; text-align: left; border-radius: 5px; font-size: 14px; color: #c53030; }
          button { background: #667eea; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-size: 16px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error">❌</div>
          <h1>Verification Failed</h1>
          <p>We couldn't verify your email address. The link may have expired or is invalid.</p>
          <div class="error-details">
            <strong>Error:</strong> ${err.message}
          </div>
          <p>Please contact support or try signing up again.</p>
          <button onclick="window.close()">Close Window</button>
        </div>
      </body>
      </html>
    `);
  }
};

exports.completeVerification = async (req, res) => {
  try {
    const userId = req.user.sub;
    const result = await AuthService.completeVerification(userId);
    
    await auditLogger.log('EMAIL_VERIFIED', {
      userId,
      email: result.profile.email,
      ip: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      message: 'Email verified successfully! Welcome email sent.',
      profile: result.profile
    });
  } catch (err) {
    console.error('Complete verification error:', err);
    
    let errorMessage = 'Failed to complete email verification.';
    let statusCode = 400;
    
    if (err.message) {
      const msg = err.message.toLowerCase();
      
      if (msg.includes('not yet verified') || msg.includes('email is not') || msg.includes('not verified')) {
        errorMessage = 'Email is not yet verified. Please click the verification link in your email first.';
      } else if (msg.includes('already verified')) {
        errorMessage = 'Email is already verified. You can sign in now.';
        statusCode = 200;
      } else if (msg.includes('not found') || msg.includes('does not exist')) {
        errorMessage = 'User profile not found. Please contact support.';
        statusCode = 404;
      } else if (err.message.length < 200) {
        errorMessage = err.message;
      }
    }
    
    await auditLogger.log('VERIFICATION_CHECK_FAILED', {
      userId: req.user?.sub,
      error: err.message,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};