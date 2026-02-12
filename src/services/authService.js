import bcrypt from 'bcrypt';
import {
    generateToken,
    generateRefreshToken,
    generateVerificationToken,
    verifyToken,
    verifyEmailToken,
    verifyPasswordResetToken,
    generatePasswordResetToken
} from '../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './emailService.js';
import * as userService from './userService.js';

/**
 * Handle user signup orchestration
 */
export const signUp = async (userData, context) => {
    const { email, password, name } = userData;
    const { userAgent, ip } = context;

    // Check if user already exists
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
        throw new Error('Unable to create account. Please try again.');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await userService.createUser(email, passwordHash, name || null);

    // Verification token
    const verificationToken = generateVerificationToken(user);
    await sendVerificationEmail(email, verificationToken);

    // Generate session tokens
    const token = generateToken(user, { userAgent, ip });
    const refresh_token = generateRefreshToken(user, { userAgent, ip });

    return { user, token, refresh_token };
};

/**
 * Handle user signin orchestration
 */
export const signIn = async (credentials, context) => {
    const { email, password } = credentials;
    const { userAgent, ip } = context;

    const user = await userService.getUserByEmail(email);
    if (!user) {
        throw new Error('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
        throw new Error('Invalid credentials');
    }

    const token = generateToken(user, { userAgent, ip });
    const refresh_token = generateRefreshToken(user, { userAgent, ip });

    return { user, token, refresh_token };
};

/**
 * Handle password reset request
 */
export const requestPasswordReset = async (email) => {
    const user = await userService.getUserByEmail(email);
    if (user) {
        const resetToken = generatePasswordResetToken(user);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await userService.setPasswordResetToken(email, resetToken, expiresAt);
        await sendPasswordResetEmail(email, resetToken);
    }
};

/**
 * Token refresh orchestration
 */
export const refreshTokens = async (refreshToken, context) => {
    const { userAgent, ip } = context;
    const decoded = verifyToken(refreshToken, { userAgent, ip });

    if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token type');
    }

    const user = await userService.getUserById(decoded.id);
    if (!user) {
        throw new Error('Invalid or expired refresh token');
    }

    const token = generateToken(user, { userAgent, ip });
    const new_refresh_token = generateRefreshToken(user, { userAgent, ip });

    return { user, token, refresh_token: new_refresh_token };
};

/**
 * Email verification orchestration
 */
export const verifyEmail = async (email, token) => {
    const decoded = verifyEmailToken(token, email);
    const user = await userService.getUserById(decoded.id);
    if (!user) throw new Error('User not found');

    await userService.verifyUserEmail(user.id);
};
