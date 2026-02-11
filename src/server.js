import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import dotenv from 'dotenv';
import authRoutes from '../routes/authRoutes.js';
import { initializeDatabase } from '../config/database.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Generate unique request ID for each request
const generateRequestId = () => {
  return crypto.randomUUID();
};

// Parse ALLOWED_ORIGINS environment variable
const parseAllowedOrigins = () => {
  const origins = process.env.ALLOWED_ORIGINS;
  if (!origins) {
    return [];
  }
  return origins.split(',').map(origin => origin.trim()).filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin matches any allowed pattern (including wildcards)
    const isOriginAllowed = allowedOrigins.some(pattern => {
      // Exact match
      if (pattern === origin) {
        return true;
      }

      // Wildcard pattern for subdomains (e.g., *.susindran.in)
      if (pattern.startsWith('*.')) {
        const domain = pattern.slice(2); // Remove *.
        const originDomain = origin.replace(/^https?:\/\//, ''); // Remove protocol
        // Match origin if it ends with the domain (with any subdomain)
        return originDomain.endsWith(domain);
      }

      return false;
    });

    if (isOriginAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// HSTS header (only in production)
if (process.env.NODE_ENV === 'production') {
  app.use(helmet.hsts({
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }));
}

// X-Frame-Options (using frameguard instead of deprecated xframe)
app.use(helmet.frameguard({ action: 'deny' }));

// X-Content-Type-Options
app.use(helmet.xssFilter());

// Rate limiting removed

app.use(express.json({ limit: '10kb' })); // Limit body size to 10KB
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Sanitize log input to prevent log injection
const sanitizeForLog = (input) => {
  if (typeof input !== 'string') return input;
  // Remove or escape control characters that could break logs
  return input
    .replace(/[\x00-\x1F\x7F]/g, (char) => {
      // Encode control characters as hex
      return `\\x${char.charCodeAt(0).toString(16).padStart(2, '0')}`;
    })
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
};

// Request logging middleware (sanitized)
app.use((req, res, next) => {
  const start = Date.now();

  // Capture response
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - start;

    // Log request with sanitized data (no sensitive info)
    console.log(JSON.stringify({
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      method: sanitizeForLog(req.method),
      path: sanitizeForLog(req.path),
      ip: sanitizeForLog(req.ip || req.headers['x-forwarded-for']?.split(',')[0]),
      userAgent: sanitizeForLog(req.get('user-agent') || 'unknown'),
      statusCode: res.statusCode,
      duration: `${duration}ms`
    }));

    return originalSend.call(this, body);
  };

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Stellar Auth Service API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: {
        signup: 'POST /api/auth/signup',
        signin: 'POST /api/auth/signin',
        signout: 'POST /api/auth/signout',
        session: 'POST /api/auth/session',
        google: 'POST /api/auth/google',
        googleCallback: 'POST /api/auth/callback/google',
        refresh: 'POST /api/auth/refresh',
        refreshJwt: 'POST /api/auth/refresh-jwt',
        resetPassword: 'POST /api/auth/reset-password'
      }
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    requestId: req.requestId
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Log error with request ID (never log sensitive data)
  console.error(JSON.stringify({
    requestId: req.requestId,
    error: sanitizeForLog(err.message),
    stack: process.env.NODE_ENV === 'development' ? sanitizeForLog(err.stack) : undefined,
    timestamp: new Date().toISOString()
  }));

  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Access denied by CORS policy',
      requestId: req.requestId
    });
  }

  // Handle rate limit errors
  if (err.message === 'Too many requests') {
    return res.status(429).json({
      success: false,
      message: err.message,
      requestId: req.requestId
    });
  }

  // Don't leak error details in production
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;

  res.status(err.status || 500).json({
    success: false,
    message: errorMessage,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      requestId: req.requestId
    }),
    requestId: req.requestId
  });
});

// Initialize database tables (optional in development mode)
const initDatabase = async () => {
  try {
    await initializeDatabase();
  } catch (err) {
    console.warn('Database initialization failed - running without database. Please configure DATABASE_URL.');
    console.warn('Error:', err.message);
  }
};

// Start server
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`🚀 Auth Service running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log('=================================');

  // Initialize database after server starts
  initDatabase();
});

export default app;
