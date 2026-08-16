/**
 * Phazon Backend — Academic Resources Routes
 */

'use strict';

const express = require('express');
const {
  getResources,
  getResourceById,
  uploadResource,
  getDownloadUrl,
  updateResource,
  deleteResource,
} = require('../controllers/resourceController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { scopeGuard } = require('../middleware/scopeGuard');

const router = express.Router();

router.get('/', requireAuth, scopeGuard, getResources);
router.get('/:id', requireAuth, scopeGuard, getResourceById);
router.get('/:id/download', requireAuth, scopeGuard, getDownloadUrl);

router.post('/', requireAuth, requireRole('teacher', 'hod', 'admin'), scopeGuard, uploadResource);
router.patch('/:id', requireAuth, requireRole('teacher', 'hod', 'admin'), scopeGuard, updateResource);
router.delete('/:id', requireAuth, requireRole('teacher', 'hod', 'admin'), deleteResource);

module.exports = router;
