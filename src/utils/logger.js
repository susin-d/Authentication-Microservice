import crypto from 'crypto';

/**
 * Generate unique request ID
 * @returns {string} UUID
 */
export const generateRequestId = () => {
    return crypto.randomUUID();
};

/**
 * Sanitize log input to prevent log injection
 * @param {any} input - Input to sanitize
 * @returns {any} Sanitized input
 */
export const sanitizeForLog = (input) => {
    if (typeof input !== 'string') return input;
    return input
        .replace(/[\x00-\x1F\x7F]/g, (char) => {
            return `\\x${char.charCodeAt(0).toString(16).padStart(2, '0')}`;
        })
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
};

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Capture response
    const originalSend = res.send;
    res.send = function (body) {
        const duration = Date.now() - start;

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
};

/**
 * Request ID middleware
 */
export const requestIdMiddleware = (req, res, next) => {
    req.requestId = generateRequestId();
    res.setHeader('X-Request-ID', req.requestId);
    next();
};
