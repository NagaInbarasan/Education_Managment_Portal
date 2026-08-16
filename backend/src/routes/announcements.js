/**
 * Phazon Backend — Announcements Routes
 */

'use strict';

const express = require('express');
const {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { scopeGuard } = require('../middleware/scopeGuard');

const router = express.Router();

router.get('/', requireAuth, scopeGuard, getAnnouncements);
router.post('/', requireAuth, requireRole('teacher', 'hod', 'admin'), scopeGuard, createAnnouncement);
router.delete('/:id', requireAuth, requireRole('teacher', 'hod', 'admin'), deleteAnnouncement);

module.exports = router;
