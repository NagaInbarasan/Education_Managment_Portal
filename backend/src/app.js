/**
 * Phazon Backend — Express Application
 *
 * Responsibilities:
 *  - Create Express application instance
 *  - Configure middleware (security, logging, JSON parsing, CORS)
 *  - Register all API routes
 *  - Attach centralized error handler
 */

'use strict';

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');

const corsOptions   = require('./config/corsOptions');
const apiRouter     = require('./routes/index');
const errorHandler  = require('./middleware/errorHandler');
const notFound      = require('./middleware/notFound');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// ── Security headers ─────────────────────────────────────────────
// Helmet is configured with an explicit Content-Security-Policy that:
//  - Keeps all default helmet protections (XSS, clickjacking, MIME sniffing, etc.)
//  - Whitelists the CDN origins the frontend legitimately loads:
//      • cdn.tailwindcss.com   — Tailwind CSS (script + style)
//      • cdn.jsdelivr.net      — Supabase JS client
//      • fonts.googleapis.com  — Google Fonts CSS
//      • fonts.gstatic.com     — Google Fonts font files
//  - Allows 'unsafe-inline' scripts/styles because Tailwind CDN requires it and
//    several pages use small inline initialisation scripts (chart rendering, etc.)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",          // required by Tailwind CDN and inline page scripts
          'https://cdn.tailwindcss.com',
          'https://cdn.jsdelivr.net',
        ],
        scriptSrcAttr: ["'unsafe-inline'"],  // for on* attribute handlers
        styleSrc: [
          "'self'",
          "'unsafe-inline'",          // required by Tailwind's JIT style injection
          'https://cdn.tailwindcss.com',
          'https://fonts.googleapis.com',
        ],
        fontSrc:   ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc:    ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'https://*.supabase.co',    // Supabase REST + Auth + Realtime
          'https://*.supabase.in',
        ],
        frameSrc:   ["'none'"],
        objectSrc:  ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    // Keep all other helmet protections at their defaults
    crossOriginEmbedderPolicy: false, // Supabase realtime needs this relaxed
  })
);

// ── CORS ─────────────────────────────────────────────────────────
app.use(cors(corsOptions));

// ── Request logging ───────────────────────────────────────────────
// 'dev' format in development, 'combined' in production
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

// ── JSON + URL-encoded body parsing ──────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Global API Rate Limiting ─────────────────────────────────────
app.use('/api', apiLimiter);

// ── API Routes ────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ── Static Frontend Files ─────────────────────────────────────────
const path = require('path');
app.use(express.static(path.join(__dirname, '../../frontend')));

// ── 404 handler (unmatched routes) ───────────────────────────────
app.use(notFound);

// ── Centralized error handler ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;
