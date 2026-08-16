/**
 * Phazon Backend — CORS Configuration
 *
 * Reads FRONTEND_URL from environment so the allowed origin
 * is never hardcoded. Easy to update for staging/production.
 */

'use strict';

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://127.0.0.1:5000',
  'http://localhost:5000',
];

const corsOptions = {
  origin(requestOrigin, callback) {
    // Allow server-to-server requests (no Origin header) and listed origins
    if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin '${requestOrigin}' not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,        // Required when auth cookies/headers are introduced (Step 25)
  optionsSuccessStatus: 200, // Some browsers (IE11) choke on 204
};

module.exports = corsOptions;
