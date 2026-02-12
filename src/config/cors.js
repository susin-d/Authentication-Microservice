/**
 * Parse ALLOWED_ORIGINS environment variable
 * @returns {string[]} Array of allowed origins
 */
const parseAllowedOrigins = () => {
    const origins = process.env.ALLOWED_ORIGINS;
    if (!origins) {
        return [];
    }
    return origins.split(',').map(origin => origin.trim()).filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

/**
 * CORS configuration options
 */
export const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }

        // Check if origin matches any allowed pattern (including wildcards)
        const isOriginAllowed = allowedOrigins.some(pattern => {
            // Exact match
            if (pattern === origin) {
                return true;
            }

            // Wildcard pattern for subdomains (e.g., *.susindran.in)
            if (pattern.startsWith('*.')) {
                const domain = pattern.slice(2); // Remove *.
                const originDomain = origin.replace(/^https?:\/\//, ''); // Remove protocol
                return originDomain.endsWith(domain);
            }

            return false;
        });

        if (isOriginAllowed) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
