/**
 * Phazon Backend — Attendance Routes
 */

'use strict';

const express = require('express');
const {
  recordAttendance,
  getSessionAttendance,
  getMyAttendance,
  getAttendanceSummary,
} = require('../controllers/attendanceController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/session', requireAuth, requireRole('teacher', 'hod', 'admin'), recordAttendance);
router.get('/session', requireAuth, getSessionAttendance);
router.get('/my', requireAuth, getMyAttendance);
router.get('/summary', requireAuth, requireRole('teacher', 'hod', 'admin'), getAttendanceSummary);

module.exports = router;
