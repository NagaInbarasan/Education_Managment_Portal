/**
 * Phazon Backend — Rate Limiting Middleware
 *
 * Protects sensitive endpoints against brute-force, credential stuffing,
 * and abuse. Uses express-rate-limit with in-memory store.
 *
 * SECURITY: Limiters are intentionally conservative for an academic platform.
 * Production deployments should use a Redis/external store for distributed limiting.
 */

'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Auth limiter — login & registration attempts.
 * 10 requests per 15-minute window per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

/**
 * AI limiter — AI assistant, study plan, performance summary, exam prep.
 * 20 requests per 15-minute window per IP.
 */
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI request limit reached. Please wait a few minutes before trying again.',
  },
});

/**
 * General API limiter — applied globally to /api.
 * 200 requests per 15-minute window per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
});

/**
 * Upload limiter — file upload endpoints.
 * 10 uploads per 15-minute window per IP.
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Upload limit reached. Please try again later.',
  },
});

module.exports = { authLimiter, aiLimiter, apiLimiter, uploadLimiter };
