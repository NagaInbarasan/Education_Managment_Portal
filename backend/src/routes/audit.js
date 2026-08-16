/**
 * Phazon Backend — Audit Log Routes
 */

'use strict';

const express = require('express');
const { getAuditLogsController } = require('../controllers/auditController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), getAuditLogsController);

module.exports = router;
