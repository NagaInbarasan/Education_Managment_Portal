/**
 * Phazon Backend — Health Controller
 *
 * Handles GET /api/health
 * Returns the API status and basic runtime metadata.
 */

'use strict';

function getHealth(req, res) {
  res.status(200).json({
    success: true,
    message: 'Phazon API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}

module.exports = { getHealth };
