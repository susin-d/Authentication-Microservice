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
console.log('CORS: Initialized with allowed origins:', allowedOrigins);

/**
 * CORS configuration options
 */
export const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }

        console.log(`CORS: Checking origin: "${origin}" against patterns:`, allowedOrigins);

        // Check if origin matches any allowed pattern (including wildcards)
        const isOriginAllowed = allowedOrigins.some(pattern => {
            // Exact match
            if (pattern === origin) {
                console.log(`CORS: Match found (exact): ${pattern}`);
                return true;
            }

            // Wildcard pattern for subdomains (e.g., *.susindran.in)
            if (pattern.startsWith('*.')) {
                const domain = pattern.slice(2); // Remove *.
                const originDomain = origin.replace(/^https?:\/\//, ''); // Remove protocol
                const matches = originDomain.endsWith(domain);
                if (matches) {
                    console.log(`CORS: Match found (wildcard): ${pattern}`);
                }
                return matches;
            }

            return false;
        });

        if (isOriginAllowed) {
            callback(null, true);
        } else {
            console.warn(`CORS: BLOCKED origin: "${origin}". Not in allowed list.`);
            // Use null, false instead of Error to allow standard browser CORS behavior
            // and avoid triggering the global error handler unnecessarily.
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
