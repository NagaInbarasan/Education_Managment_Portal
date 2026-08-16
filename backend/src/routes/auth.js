/**
 * Phazon Backend — Auth Routes
 *
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/create-user (Admin Only)
 */

'use strict';

const express = require('express');
const { registerUser, loginUser, createUserByAdmin } = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/create-user', requireAuth, requireRole('admin'), createUserByAdmin);

module.exports = router;
