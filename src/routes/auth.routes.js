/**
 * Auth Routes - v1.0.2
 * API v1 route definitions with validation middleware
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { signupValidation, signinValidation } = require('../middleware/validator.middleware');

// Public Routes
router.post('/signup', signupValidation, authController.register);
router.post('/signin', signinValidation, authController.login);
router.get('/verify-email', authController.verifyEmail);
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// Protected Routes
router.post('/complete-verification', protect, authController.completeVerification);
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);
router.delete('/delete-account', protect, authController.removeAccount);

module.exports = router;