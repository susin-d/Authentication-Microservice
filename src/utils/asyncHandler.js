/**
 * Wraps an asynchronous middleware/handler to catch any errors and pass them to the next middleware.
 * This eliminates the need for try-catch blocks in every controller.
 * 
 * @param {Function} fn - Asynchronous middleware function
 * @returns {Function} Wrapped middleware
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
