/**
 * Phazon Backend — 404 Not Found Middleware
 *
 * Catches requests that didn't match any registered route
 * and returns a clean JSON 404 response.
 */

'use strict';

function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = notFound;
