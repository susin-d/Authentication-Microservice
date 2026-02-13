/**
 * Auth Service - v3.0.0
 * Relational database authentication
 * Uses separate tables for users, profiles, tokens, and OAuth
 */

const supabase = require('../config/supabase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const EmailService = require('./email.service');
const securityConfig = require('../config/security.config');
const auditLogger = require('../utils/audit.logger');

const SALT_ROUNDS = 12;
const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

const generateToken = () => crypto.randomBytes(32).toString('hex');

const validateHttpsUrl = (frontendUrl) => {
  if (!frontendUrl) return null;
  try {
    const parsedUrl = new URL(frontendUrl);
    // Allow http for localhost/127.0.0.1 in development, require https otherwise
    const isLocalhost = parsedUrl.hostname === 'localhost' || 
                       parsedUrl.hostname === '127.0.0.1' || 
                       parsedUrl.hostname.endsWith('.localhost');
    
    if (parsedUrl.protocol === 'http:' && !isLocalhost) {
      throw new Error('frontendUrl must be a valid https:// URL (http only allowed for localhost)');
    }
    
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new Error('frontendUrl must be a valid http:// or https:// URL');
    }
    
    return frontendUrl.replace(/\/+$/, '');
  } catch (error) {
    throw new Error(error.message || 'frontendUrl must be a valid https:// URL');
  }
};

class AuthService {
  async signUp(email, password, frontendUrl) {
    // 1. Check if email exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      const error = new Error('A user with this email address has already been registered');
      error.code = 'email_exists';
      error.status = 422;
      throw error;
    }

    // 2. Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. Create user (triggers auto-profile creation)
    const {data: newUser, error: userError} = await supabase
      .from('users')
      .insert([{
        email,
        password_hash,
        email_verified: false,
        account_status: 'active'
      }])
      .select()
      .single();

    if (userError) throw userError;

    // 4. Generate and store verification token
    const token = generateToken();
    const expires_at = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);

    await supabase
      .from('user_auth_tokens')
      .insert([{
        user_id: newUser.id,
        token_type: 'email_verification',
        token,
        expires_at
      }]);

    // 5. Send verification email
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const verificationLink = `${backendUrl}/api/v1/auth/verify-email?token=${token}`;
    
    EmailService
      .sendVerificationEmail(email, verificationLink)
      .catch(err => console.error('Email failed', err));

    return {
      id: newUser.id,
      email: newUser.email,
      created_at: newUser.created_at
    };
  }

  async signIn(email, password) {
    // 1. Get user with profile
    const { data: user, error } = await supabase
      .from('users_complete')
      .select('*')
      .eq('email', email)
      .eq('account_status', 'active')
      .single();

    if (error || !user) {
      throw new Error('Invalid email or password');
    }

    // 2. Get password hash from users table
    const { data: authData } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .single();

    // 3. Check email verification
    if (!user.email_verified) {
      throw new Error('Please verify your email before signing in. Check your inbox for the verification link.');
    }

    // 4. Verify password
    const isPasswordValid = await bcrypt.compare(password, authData.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // 5. Update last signin
    await supabase
      .from('users')
      .update({ last_signin_at: new Date().toISOString() })
      .eq('id', user.id);

    // 6. Generate JWT
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: securityConfig.jwt.accessTokenExpiry }
    );

    await auditLogger.logSuccessfulAuth(user.id, email, 'email', null);

    // 7. Return user data (view already excludes password_hash)
    return {
      user,
      access_token: token
    };
  }

  async verifyEmailFromToken(token, type) {
    // 1. Find valid unused token
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_auth_tokens')
      .select('*')
      .eq('token', token)
      .eq('token_type', 'email_verification')
      .is('used_at', null)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Invalid or expired verification token');
    }

    // 2. Check expiry
    if (new Date() > new Date(tokenData.expires_at)) {
      throw new Error('Verification token has expired. Please request a new one.');
    }

    // 3. Get user info
    const { data: userData } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', tokenData.user_id)
      .single();

    // 4. Mark token as used
    await supabase
      .from('user_auth_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    // 5. Update user email_verified
    await supabase
      .from('users')
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString()
      })
      .eq('id', tokenData.user_id);

    // 6. Get complete user data
    const { data: user } = await supabase
      .from('users_complete')
      .select('*')
      .eq('id', tokenData.user_id)
      .single();

    // 7. Send welcome email
    EmailService
      .sendWelcomeEmail(userData.email, user.full_name)
      .catch(err => console.error('Welcome email failed', err));

    await auditLogger.log({
      user_id: tokenData.user_id,
      event_type: 'EMAIL_VERIFIED',
      details: { email: tokenData.users.email }
    });

    return {
      verified: true,
      email: tokenData.users.email,
      user
    };
  }

  async deleteAccount(userId) {
    // Soft delete
    const { error } = await supabase
      .from('users')
      .update({
        account_status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  }

  async getGoogleAuthUrl(origin, frontendUrl) {
    const callbackUrl = new URL('/api/v1/auth/google/callback', origin);
    
    // Encode frontend_url in state parameter for recovery after OAuth callback
    const state = frontendUrl ? Buffer.from(frontendUrl).toString('base64') : '';
    
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set('redirect_uri', callbackUrl.toString());
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'email profile openid');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');
    if (state) {
      googleAuthUrl.searchParams.set('state', state);
    }
    return googleAuthUrl.toString();
  }

  async exchangeGoogleCode(code, origin) {
    // 1. Exchange code for tokens
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const callbackUrl = new URL('/api/v1/auth/google/callback', origin);

    const tokenResponse = await axios.post(tokenUrl, {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl.toString(),
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, id_token, expires_in } = tokenResponse.data;
    const token_expires_at = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null;

    // 2. Get user info from Google
    const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { email, id: googleId, name, picture } = userInfoResponse.data;

    // 3. Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, email_verified')
      .eq('email', email)
      .single();

    let userId;

    if (existingUser) {
      // Update existing user
      userId = existingUser.id;
      
      await supabase
        .from('users')
        .update({ last_signin_at: new Date().toISOString() })
        .eq('id', userId);

      // Check/update OAuth connection
      const { data: oauthConn } = await supabase
        .from('user_oauth')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .single();

      if (oauthConn) {
        await supabase
          .from('user_oauth')
          .update({
            access_token,
            refresh_token,
            token_expires_at,
            provider_avatar_url: picture,
            provider_name: name
          })
          .eq('id', oauthConn.id);
      } else {
        await supabase
          .from('user_oauth')
          .insert([{
            user_id: userId,
            provider: 'google',
            provider_user_id: googleId,
            provider_email: email,
            provider_avatar_url: picture,
            provider_name: name,
            access_token,
            refresh_token,
            token_expires_at
          }]);
      }

      // Update profile with Google data if empty
      await supabase
        .from('user_profiles')
        .update({
          full_name: name,
          avatar_url: picture
        })
        .eq('user_id', userId)
        .is('full_name', null);

    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          email,
          password_hash: 'GOOGLE_OAUTH',
          email_verified: true,
          email_verified_at: new Date().toISOString(),
          account_status: 'active',
          last_signin_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        if (createError.code === '23505') {
          throw new Error('An account with this email already exists. Please sign in with your email and password.');
        }
        throw createError;
      }

      userId = newUser.id;

      // Create OAuth connection
      await supabase
        .from('user_oauth')
        .insert([{
          user_id: userId,
          provider: 'google',
          provider_user_id: googleId,
          provider_email: email,
          provider_avatar_url: picture,
          provider_name: name,
          access_token,
          refresh_token,
          token_expires_at
        }]);

      // Update profile with Google data
      await supabase
        .from('user_profiles')
        .update({
          full_name: name,
          avatar_url: picture
        })
        .eq('user_id', userId);

      // Send welcome email
      EmailService
        .sendWelcomeEmail(email, name)
        .catch(err => console.error('Welcome email failed', err));
    }

    // 4. Get complete user data
    const { data: user } = await supabase
      .from('users_complete')
      .select('*')
      .eq('id', userId)
      .single();

    // 5. Generate JWT
    const serviceToken = jwt.sign(
      { sub: userId, email, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: securityConfig.jwt.accessTokenExpiry }
    );

    await auditLogger.logSuccessfulAuth(userId, email, 'google', null);

    return {
      access_token: serviceToken,
      refresh_token,
      google_access_token: access_token,
      user
    };
  }

  buildFrontendRedirect(frontendUrlParam) {
    // Use provided frontend_url or fallback to environment variable
    const frontendUrl = frontendUrlParam || process.env.FRONTEND_URL;
    
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL environment variable is required');
    }
    
    // Validate the URL
    const validated = validateHttpsUrl(frontendUrl);
    if (!validated) {
      throw new Error('Invalid frontend URL format or protocol');
    }
    
    return frontendUrl;
  }

  async getProfile(userId) {
    const { data: user, error } = await supabase
      .from('users_complete')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    return user;
  }

  async updateProfile(userId, updates) {
    const allowedFields = [
      'full_name', 'display_name', 'avatar_url', 'bio',
      'date_of_birth', 'gender', 'phone_number',
      'country', 'city', 'website_url'
    ];

    const sanitizedUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(sanitizedUpdates)
      .eq('user_id', userId);

    if (error) throw error;

    // Return updated complete profile
    return this.getProfile(userId);
  }

  async requestPasswordReset(email) {
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (!user) {
      return { success: true }; // Don't reveal if email exists
    }

    // Generate token
    const token = generateToken();
    const expires_at = new Date(Date.now() + RESET_TOKEN_EXPIRY);

    await supabase
      .from('user_auth_tokens')
      .insert([{
        user_id: user.id,
        token_type: 'password_reset',
        token,
        expires_at
      }]);

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const resetLink = `${backendUrl}/api/v1/auth/reset-password?token=${token}`;

    // TODO: Implement EmailService.sendPasswordResetEmail()
    console.log(`Password reset link: ${resetLink}`);

    return { success: true };
  }

  async resetPassword(token, newPassword) {
    // Find valid unused token
    const { data: tokenData } = await supabase
      .from('user_auth_tokens')
      .select('*')
      .eq('token', token)
      .eq('token_type', 'password_reset')
      .is('used_at', null)
      .single();

    if (!tokenData) {
      throw new Error('Invalid or expired reset token');
    }

    if (new Date() > new Date(tokenData.expires_at)) {
      throw new Error('Reset token has expired. Please request a new one.');
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await supabase
      .from('users')
      .update({ password_hash })
      .eq('id', tokenData.user_id);

    // Mark token as used
    await supabase
      .from('user_auth_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    return { success: true };
  }
}

module.exports = new AuthService();
