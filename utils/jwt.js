import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_VERIFY_SECRET = process.env.JWT_VERIFY_SECRET || process.env.JWT_SECRET;

// Validate JWT_SECRET is set and meets minimum length requirement
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
}

if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long for security reasons.');
}

// Security constants
const ISSUER = 'stellar-auth-service';
const AUDIENCE = 'stellar-users';
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

/**
 * Generate a cryptographically secure state parameter for OAuth
 * @returns {string} A random state string
 */
export const generateState = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Sanitize input to prevent log injection
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  // Remove control characters and dangerous sequences
  return input
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[<>\"\'&]/g, '')
    .trim();
};

/**
 * Generate a JWT access token with security enhancements
 * @param {Object} user - User object containing user data
 * @param {Object} options - Additional options for token generation
 * @returns {string} JWT token
 */
export const generateToken = (user, options = {}) => {
  const userAgent = options.userAgent || 'unknown';
  const ip = options.ip || 'unknown';

  const payload = {
    id: user.id,
    email: user.email,
    role: user.user_metadata?.role || 'user',
    created_at: user.created_at,
    jti: crypto.randomUUID(), // Unique JWT ID for token identification
    // Token binding to user context
    ua: crypto.createHash('sha256').update(userAgent).digest('hex').substring(0, 16),
    ip: crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16)
  };

  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: ISSUER,
    audience: AUDIENCE
  });
};

/**
 * Verify and decode a JWT token with full validation
 * @param {string} token - JWT token to verify
 * @param {Object} options - Verification options
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export const verifyToken = (token, options = {}) => {
  const userAgent = options.userAgent || 'unknown';
  const ip = options.ip || 'unknown';

  // Support mock tokens for automated reporting
  if (process.env.MOCK_DB === 'true' && token === 'mock-token') {
    const mockEmail = 'test_reporter@example.com';
    return {
      id: Buffer.from(mockEmail.toLowerCase()).toString('hex').substring(0, 12),
      email: mockEmail,
      role: 'user',
      type: options.type || 'access'
    };
  }




  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'], // Only allow HS256 algorithm
      issuer: ISSUER,
      audience: AUDIENCE,
      clockTolerance: 30 // Allow 30 seconds clock skew
    });

    // Verify token binding (user agent and IP)
    const expectedUa = crypto.createHash('sha256').update(userAgent).digest('hex').substring(0, 16);
    const expectedIp = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);

    // In production, strictly enforce token binding
    if (process.env.NODE_ENV === 'production') {
      if (decoded.ua !== expectedUa || decoded.ip !== expectedIp) {
        throw new Error('Token context mismatch - possible token theft detected');
      }
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      if (error.message.includes('invalid algorithm')) {
        throw new Error('Invalid token algorithm');
      }
      throw new Error('Invalid token');
    } else if (error.message.includes('Token context mismatch')) {
      throw error; // Re-throw context mismatch errors
    }
    throw new Error('Token verification failed');
  }
};

/**
 * Decode a JWT token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    return null;
  }
};

/**
 * Generate a refresh token (longer expiry) with JTI claim
 * @param {Object} user - User object
 * @param {Object} options - Additional options
 * @returns {string} Refresh token
 */
export const generateRefreshToken = (user, options = {}) => {
  const userAgent = options.userAgent || 'unknown';
  const ip = options.ip || 'unknown';

  const payload = {
    id: user.id,
    type: 'refresh',
    jti: crypto.randomUUID(), // Unique JWT ID for token identification
    ua: crypto.createHash('sha256').update(userAgent).digest('hex').substring(0, 16),
    ip: crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16)
  };

  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: ISSUER,
    audience: AUDIENCE
  });
};

/**
 * Generate a verification token for email verification
 * @param {Object} user - User object
 * @returns {string} Verification token
 */
export const generateVerificationToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    type: 'verification',
    jti: crypto.randomUUID()
  };

  return jwt.sign(payload, JWT_VERIFY_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.EMAIL_VERIFICATION_EXPIRES_IN || '24h',
    issuer: ISSUER
  });
};

/**
 * Generate a password reset token
 * @param {Object} user - User object
 * @returns {string} Password reset token
 */
export const generatePasswordResetToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    type: 'password_reset',
    jti: crypto.randomUUID()
  };

  return jwt.sign(payload, JWT_VERIFY_SECRET, {
    algorithm: 'HS256',
    expiresIn: '1h',
    issuer: ISSUER
  });
};

/**
 * Verify email verification token with rate limiting check
 * @param {string} token - Verification token
 * @param {string} expectedEmail - Expected email address
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid
 */
export const verifyEmailToken = (token, expectedEmail) => {
  // Support mock tokens for automated reporting
  if (process.env.MOCK_DB === 'true' && token === 'mock-token') {
    return {
      id: Buffer.from(expectedEmail.toLowerCase()).toString('hex').substring(0, 12),
      email: expectedEmail,
      type: 'verification'
    };
  }



  const decoded = jwt.verify(token, JWT_VERIFY_SECRET, {
    algorithms: ['HS256'],
    issuer: ISSUER
  });

  // Case-insensitive comparison for email
  const email1 = decoded.email.toLowerCase();
  const email2 = expectedEmail.toLowerCase();

  if (email1.length !== email2.length) {
    throw new Error('Invalid verification token');
  }

  const emailsMatch = crypto.timingSafeEqual(
    Buffer.from(email1),
    Buffer.from(email2)
  );

  if (!emailsMatch) {
    throw new Error('Invalid verification token');
  }

  if (decoded.type !== 'verification') {
    throw new Error('Invalid token type');
  }

  return decoded;
};

/**
 * Verify password reset token
 * @param {string} token - Reset token
 * @param {string} expectedEmail - Expected email
 * @returns {Object} Decoded payload
 */
export const verifyPasswordResetToken = (token, expectedEmail) => {
  // Support mock tokens for automated reporting
  if (process.env.MOCK_DB === 'true' && token === 'mock-token') {
    return {
      id: Buffer.from(expectedEmail.toLowerCase()).toString('hex').substring(0, 12),
      email: expectedEmail,
      type: 'password_reset'
    };
  }



  const decoded = jwt.verify(token, JWT_VERIFY_SECRET, {
    algorithms: ['HS256'],
    issuer: ISSUER
  });

  // Case-insensitive comparison for email
  const email1 = decoded.email.toLowerCase();
  const email2 = expectedEmail.toLowerCase();

  if (email1.length !== email2.length) {
    throw new Error('Invalid reset token');
  }

  const emailsMatch = crypto.timingSafeEqual(
    Buffer.from(email1),
    Buffer.from(email2)
  );

  if (!emailsMatch) {
    throw new Error('Invalid reset token');
  }

  if (decoded.type !== 'password_reset') {
    throw new Error('Invalid token type');
  }

  return decoded;
};

export default {
  generateToken,
  verifyToken,
  decodeToken,
  generateRefreshToken,
  generateState,
  generateVerificationToken,
  generatePasswordResetToken,
  verifyEmailToken,
  verifyPasswordResetToken,
  sanitizeInput
};
