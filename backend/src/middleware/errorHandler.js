/**
 * Phazon Backend — Centralized Error Handler Middleware
 *
 * Catches any error passed via next(err) and returns a
 * consistent JSON error response. Stack traces are hidden
 * in production to prevent information leakage.
 */

'use strict';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV !== 'production';

  // Determine HTTP status code
  const statusCode = err.statusCode || err.status || 500;

  // Build response payload
  const payload = {
    success: false,
    message: err.message || 'Something went wrong',
  };

  // Include stack trace only in development
  if (isDev && err.stack) {
    payload.stack = err.stack;
  }

  // Log server errors
  if (statusCode >= 500) {
    console.error(`[Phazon Error] ${statusCode}`, err);
  }

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;
