import { generateState } from '../../utils/jwt.js';
import { oauthStates } from '../../services/oauthService.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const signInWithGoogle = asyncHandler(async (req, res) => {
    const state = generateState();

    oauthStates.set(state, {
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000
    });

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/callback/google`;

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('openid email profile')}&` +
        `state=${state}&` +
        `access_type=offline&` +
        `prompt=consent`;

    res.status(200).json({
        success: true,
        message: 'Google OAuth URL generated',
        data: {
            url: authUrl,
            provider: 'google',
            state: state
        }
    });
});

export const googleCallback = asyncHandler(async (req, res) => {
    const { access_token, refresh_token, state } = req.body;

    if (!state) {
        return res.status(400).json({ success: false, message: 'State parameter is required' });
    }

    const stateData = oauthStates.get(state);
    if (!stateData || Date.now() > stateData.expiresAt) {
        oauthStates.delete(state);
        return res.status(400).json({ success: false, message: 'Invalid or expired state parameter' });
    }

    oauthStates.delete(state);

    if (!access_token) {
        return res.status(400).json({ success: false, message: 'Access token is required' });
    }

    res.status(200).json({
        success: true,
        message: 'Google OAuth successful',
        data: {
            token: access_token,
            jwt_refresh_token: refresh_token
        }
    });
});
