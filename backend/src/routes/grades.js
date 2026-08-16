/**
 * Phazon Backend — Grades Routes
 */

'use strict';

const express = require('express');
const {
  recordGrade,
  getMyGrades,
  getClassGrades,
} = require('../controllers/gradeController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, requireRole('teacher', 'hod', 'admin'), recordGrade);
router.get('/my-grades', requireAuth, getMyGrades);
router.get('/class/:classId', requireAuth, requireRole('teacher', 'hod', 'admin'), getClassGrades);

module.exports = router;
