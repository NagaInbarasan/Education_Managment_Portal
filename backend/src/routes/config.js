/**
 * Phazon Backend — Academic System Configuration Routes
 */

'use strict';

const express = require('express');
const {
  getAllConfigs,
  getConfigByKey,
  updateConfigByKey,
} = require('../controllers/configController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, getAllConfigs);
router.get('/:key', requireAuth, getConfigByKey);
router.put('/:key', requireAuth, requireRole('admin'), updateConfigByKey);

module.exports = router;
