import * as authService from '../../services/authService.js';
import * as userService from '../../services/userService.js';
import { isValidEmail, validatePassword } from '../../utils/validation.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { verifyPasswordResetToken } from '../../utils/jwt.js';
import bcrypt from 'bcrypt';

export const resetPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
        return res.status(400).json({ success: false, message: 'Valid email is required' });
    }

    await authService.requestPasswordReset(email);

    res.status(200).json({
        success: true,
        message: 'If an account exists, a password reset email will be sent'
    });
});

export const resetPasswordWithToken = asyncHandler(async (req, res) => {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
        return res.status(400).json({ success: false, message: 'Email, reset token, and new password are required' });
    }

    // Verify token (throws if invalid)
    verifyPasswordResetToken(resetToken, email);

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
        return res.status(400).json({
            success: false,
            message: `Password must contain ${passwordValidation.errors.join(', ')}`
        });
    }

    const user = await userService.getUserByResetToken(resetToken);
    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await userService.updateUserPassword(user.id, passwordHash);
    await userService.clearPasswordResetToken(user.id);

    res.status(200).json({
        success: true,
        message: 'Password reset successfully. You can now sign in with your new password.'
    });
});
