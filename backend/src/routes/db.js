/**
 * Phazon Backend — Database Health Route
 *
 * GET /api/db/health
 */

'use strict';

const express = require('express');
const { getDbHealth } = require('../controllers/dbHealthController');

const router = express.Router();

router.get('/health', getDbHealth);

module.exports = router;
