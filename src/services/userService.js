import { query } from '../config/database.js';

/**
 * Get user by email from database
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null
 */
export const getUserByEmail = async (email) => {
    const result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
    );
    return result.rows[0] || null;
};

/**
 * Get user by ID from database
 * @param {string} id - User ID
 * @returns {Promise<Object|null>} User object or null
 */
export const getUserById = async (id) => {
    const result = await query(
        'SELECT * FROM users WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
};

/**
 * Create a new user in the database
 * @param {string} email - User email
 * @param {string} passwordHash - Hashed password
 * @param {string} name - User name (optional)
 * @returns {Promise<Object>} Created user
 */
export const createUser = async (email, passwordHash, name = null) => {
    const result = await query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
        [email.toLowerCase(), passwordHash, name]
    );
    return result.rows[0];
};

/**
 * Update user verification status
 * @param {string} id - User ID
 * @returns {Promise<Object>} Updated user
 */
export const verifyUserEmail = async (id) => {
    const result = await query(
        'UPDATE users SET verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

/**
 * Update user password
 * @param {string} id - User ID
 * @param {string} passwordHash - New hashed password
 * @returns {Promise<Object>} Updated user
 */
export const updateUserPassword = async (id, passwordHash) => {
    const result = await query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [passwordHash, id]
    );
    return result.rows[0];
};

/**
 * Set password reset token for user
 * @param {string} email - User email
 * @param {string} resetToken - Reset token
 * @param {Date} expiresAt - Token expiration time
 * @returns {Promise<Object>} Updated user
 */
export const setPasswordResetToken = async (email, resetToken, expiresAt) => {
    const result = await query(
        'UPDATE users SET reset_token = $1, reset_token_expires = $2, updated_at = CURRENT_TIMESTAMP WHERE email = $3 RETURNING *',
        [resetToken, expiresAt, email.toLowerCase()]
    );
    return result.rows[0];
};

/**
 * Clear password reset token for user
 * @param {string} id - User ID
 * @returns {Promise<Object>} Updated user
 */
export const clearPasswordResetToken = async (id) => {
    const result = await query(
        'UPDATE users SET reset_token = NULL, reset_token_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

/**
 * Get user by reset token
 * @param {string} resetToken - Reset token
 * @returns {Promise<Object|null>} User object or null
 */
export const getUserByResetToken = async (resetToken) => {
    const result = await query(
        'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > CURRENT_TIMESTAMP',
        [resetToken]
    );
    return result.rows[0] || null;
};

/**
 * Delete a user from the database
 * @param {string} id - User ID
 * @returns {Promise<number>} Number of rows deleted
 */
export const deleteUser = async (id) => {
    const result = await query(
        'DELETE FROM users WHERE id = $1',
        [id]
    );
    return result.rowCount;
};
