/**
 * Phazon Backend — Server Entry Point
 *
 * Responsibilities:
 *  - Load environment variables from .env
 *  - Import the configured Express application
 *  - Start the HTTP server on the configured PORT
 *  - Handle unhandled promise rejections gracefully
 */

'use strict';

// Load .env before anything else
require('dotenv').config();

const app  = require('./app');

const PORT = process.env.PORT || 5000;
const ENV  = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  console.log('');
  console.log('  ██████  ██   ██  █████  ███████  ██████  ███   ██');
  console.log('  ██   ██ ██   ██ ██   ██     ███  ██  ██  ████  ██');
  console.log('  ██████  ███████ ███████   ███    ██  ██  ██ ██ ██');
  console.log('  ██      ██   ██ ██   ██  ███     ██  ██  ██  ████');
  console.log('  ██      ██   ██ ██   ██ ███████  ██████  ██   ███');
  console.log('');
  console.log(`  🚀  Phazon API is running`);
  console.log(`  ►  http://localhost:${PORT}/api/health`);
  console.log(`  ●  Environment : ${ENV}`);
  console.log(`  ●  Port        : ${PORT}`);
  console.log('');
});

// ── Graceful shutdown on unhandled rejections ─────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Phazon] Unhandled Rejection at:', promise, 'reason:', reason);
  // Shut down cleanly so the process manager can restart if needed
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('[Phazon] Uncaught Exception:', err);
  process.exit(1);
});
