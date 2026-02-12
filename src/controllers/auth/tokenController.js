import * as authService from '../../services/authService.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const refreshToken = asyncHandler(async (req, res) => {
    const { jwt_refresh_token } = req.body;
    if (!jwt_refresh_token) {
        return res.status(400).json({ success: false, message: 'JWT refresh token is required' });
    }

    const userAgent = req.get('user-agent') || 'unknown';
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';

    const { user, token, refresh_token } = await authService.refreshTokens(
        jwt_refresh_token,
        { userAgent, ip }
    );

    res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
            token,
            refresh_token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                verified: user.verified
            }
        }
    });
});

export const refreshJwtToken = refreshToken; // Alias or similar implementation
