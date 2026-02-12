import helmet from 'helmet';

/**
 * Configure security middleware (Helmet)
 * @param {import('express').Application} app - Express application instance
 */
export const configureSecurity = (app) => {
    // Security headers with Helmet
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }));

    // HSTS header (only in production)
    if (process.env.NODE_ENV === 'production') {
        app.use(helmet.hsts({
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        }));
    }

    // X-Frame-Options
    app.use(helmet.frameguard({ action: 'deny' }));

    // XSS Filter
    app.use(helmet.xssFilter());
};
