import { sanitizeInput } from './jwt.js';

/**
 * Validate email format comprehensively
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
    if (typeof email !== 'string') return false;

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;

    // Length checks
    if (email.length > 254) return false;

    // Local part length check (before @)
    const [localPart] = email.split('@');
    if (localPart.length > 64) return false;

    // Check for dangerous patterns
    if (email.includes('..') || email.includes('.@') || email.includes('@.')) {
        return false;
    }

    // Check for valid characters
    const validEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return validEmailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8) {
        errors.push('at least 8 characters');
    }
    if (password.length > 128) {
        errors.push('maximum 128 characters');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
    if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('password is too common');
    }

    return { valid: errors.length === 0, errors };
};

/**
 * Sanitize user input to prevent injection attacks
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
export const sanitizeUserInput = (obj) => {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeInput(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
};
