import * as authService from '../../services/authService.js';
import * as userService from '../../services/userService.js';
import { sanitizeUserInput } from '../../utils/validation.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { verifyToken } from '../../utils/jwt.js';

export const signIn = asyncHandler(async (req, res) => {
    const sanitizedBody = sanitizeUserInput(req.body);
    const { email, password } = sanitizedBody;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const userAgent = req.get('user-agent') || 'unknown';
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';

    const { user, token, refresh_token } = await authService.signIn(
        { email, password },
        { userAgent, ip }
    );

    res.status(200).json({
        success: true,
        message: 'Sign in successful',
        data: {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                verified: user.verified,
                created_at: user.created_at
            },
            token,
            jwt_refresh_token: refresh_token
        }
    });
});

export const signOut = asyncHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Sign out successful'
    });
});

export const getSession = asyncHandler(async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) {
        return res.status(400).json({ success: false, message: 'Access token is required' });
    }

    const userAgent = req.get('user-agent') || 'unknown';
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';

    const decoded = verifyToken(access_token, { userAgent, ip });
    const user = await userService.getUserById(decoded.id);

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found or session expired' });
    }

    res.status(200).json({
        success: true,
        data: {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                verified: user.verified,
                created_at: user.created_at
            }
        }
    });
});
