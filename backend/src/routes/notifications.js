/**
 * Phazon Backend — Notifications Routes
 */

'use strict';

const express = require('express');
const {
  getUserNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
} = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, getUserNotifications);
router.get('/unread-count', requireAuth, getUnreadCount);
router.patch('/read-all', requireAuth, markAllRead);
router.patch('/:id/read', requireAuth, markNotificationRead);

module.exports = router;
