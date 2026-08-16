/**
 * Phazon Backend — Timetable Routes
 */

'use strict';

const express = require('express');
const {
  getTimetable,
  getTodaySchedule,
  createTimetableEntry,
  validateSchedule,
  publishTimetable,
  updateTimetableEntry,
  deleteTimetableEntry,
} = require('../controllers/timetableController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { scopeGuard } = require('../middleware/scopeGuard');

const router = express.Router();

router.get('/', requireAuth, scopeGuard, getTimetable);
router.get('/today', requireAuth, scopeGuard, getTodaySchedule);
router.post('/', requireAuth, requireRole('teacher', 'hod', 'admin'), scopeGuard, createTimetableEntry);
router.post('/validate', requireAuth, validateSchedule);
router.post('/publish', requireAuth, requireRole('hod', 'admin'), scopeGuard, publishTimetable);
router.patch('/:id', requireAuth, requireRole('teacher', 'hod', 'admin'), scopeGuard, updateTimetableEntry);
router.delete('/:id', requireAuth, requireRole('teacher', 'hod', 'admin'), deleteTimetableEntry);

module.exports = router;
