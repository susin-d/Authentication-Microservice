// In-memory store for OAuth states (in production, use Redis or database)
export const oauthStates = new Map();

/**
 * Clean up expired OAuth states (older than 10 minutes)
 */
export const cleanupExpiredStates = () => {
    const now = Date.now();
    for (const [state, data] of oauthStates.entries()) {
        if (now > data.expiresAt) {
            oauthStates.delete(state);
        }
    }
};

// Clean up expired states every 5 minutes
setInterval(cleanupExpiredStates, 5 * 60 * 1000);
