import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as authController from '../controllers/auth/index.js';

const {
  signUp,
  signIn,
  signOut,
  getSession,
  signInWithGoogle,
  googleCallback,
  refreshToken,
  refreshJwtToken,
  resetPassword,
  verifyEmail,
  resendVerification,
  resetPasswordWithToken,
  deleteAccount
} = authController;

const router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Sign up a new user with email and password
 * @access  Public
 */
router.post('/signup', signUp);

/**
 * @route   POST /api/auth/signin
 * @desc    Sign in a user with email and password
 * @access  Public
 */
router.post('/signin', signIn);

/**
 * @route   POST /api/auth/signout
 * @desc    Sign out the current user
 * @access  Private (requires JWT token)
 */
router.post('/signout', authenticate, signOut);

/**
 * @route   POST /api/auth/session
 * @desc    Get the current user session
 * @access  Private (requires JWT token)
 */
router.post('/session', authenticate, getSession);

/**
 * @route   POST /api/auth/google
 * @desc    Initiate Google OAuth sign in
 * @access  Public
 */
router.post('/google', signInWithGoogle);

/**
 * @route   POST /api/auth/callback/google
 * @desc    Handle Google OAuth callback
 * @access  Public
 */
router.post('/callback/google', googleCallback);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh the access token
 * @access  Public (requires refresh_token)
 */
router.post('/refresh', refreshToken);

/**
 * @route   POST /api/auth/refresh-jwt
 * @desc    Refresh the JWT token
 * @access  Public (requires jwt_refresh_token)
 */
router.post('/refresh-jwt', refreshJwtToken);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/reset-password', resetPassword);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with verification token
 * @access  Public
 */
router.post('/verify-email', verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post('/resend-verification', resendVerification);

/**
 * @route   POST /api/auth/reset-password/confirm
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password/confirm', resetPasswordWithToken);

/**
 * @route   DELETE /api/auth/delete-account
 * @desc    Delete the current user's account
 * @access  Private (requires JWT token)
 */
router.delete('/delete-account', authenticate, deleteAccount);

export default router;
