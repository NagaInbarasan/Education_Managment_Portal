/**
 * Phazon Backend — Rooms Routes
 */

'use strict';

const express = require('express');
const { getRooms, createRoom, updateRoom, deleteRoom } = require('../controllers/roomController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { scopeGuard } = require('../middleware/scopeGuard');

const router = express.Router();

router.get('/', requireAuth, getRooms);
router.post('/', requireAuth, requireRole('hod', 'admin'), scopeGuard, createRoom);
router.patch('/:id', requireAuth, requireRole('hod', 'admin'), scopeGuard, updateRoom);
router.delete('/:id', requireAuth, requireRole('admin'), deleteRoom);

module.exports = router;
