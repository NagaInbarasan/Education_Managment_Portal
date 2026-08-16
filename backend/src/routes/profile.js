/**
 * Phazon Backend — Profile Routes
 *
 * GET  /api/profile   → get authenticated user's profile
 * POST /api/profile   → upsert profile (called after OAuth or register)
 */

'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getProfile, upsertProfile } = require('../controllers/profileController');

const router = express.Router();

router.get('/', requireAuth, getProfile);
router.post('/', requireAuth, upsertProfile);

module.exports = router;

