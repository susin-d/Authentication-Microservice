import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables immediately
dotenv.config();

import authRoutes from './routes/authRoutes.js';
import { initializeDatabase } from './config/database.js';
import { corsOptions } from './config/cors.js';
import { configureSecurity } from './config/security.js';
import { requestIdMiddleware, requestLogger, sanitizeForLog } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Apply Request ID and Logging middleware
app.use(requestIdMiddleware);
app.use(requestLogger);

// Apply CORS middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle all preflight requests

// Configure Security Headers (Helmet, etc.)
configureSecurity(app);

// Request parsing
app.use(express.json({ limit: '10kb' })); // Limit body size to 10KB
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

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
        resetPassword: 'POST /api/auth/reset-password',
        deleteAccount: 'DELETE /api/auth/delete-account'
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
