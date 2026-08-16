/**
 * Phazon Backend — Exams Routes
 */

'use strict';

const express = require('express');
const {
  getExams,
  getExamDetails,
  createExam,
  updateExam,
  addQuestion,
  startExam,
  submitExam,
  getExamResults
} = require('../controllers/examController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { scopeGuard } = require('../middleware/scopeGuard');

const router = express.Router();

// Teacher/HOD/Admin routes
router.post('/', requireAuth, requireRole('teacher', 'admin'), createExam);
router.patch('/:id', requireAuth, requireRole('teacher', 'admin'), updateExam);
router.post('/:id/questions', requireAuth, requireRole('teacher', 'admin'), addQuestion);
router.get('/:id/results', requireAuth, requireRole('teacher', 'hod', 'admin'), getExamResults);

// Common / Student routes
router.get('/', requireAuth, scopeGuard, getExams);
router.get('/:id', requireAuth, getExamDetails);
router.post('/:id/start', requireAuth, requireRole('student'), startExam);
router.post('/:id/submit', requireAuth, requireRole('student'), submitExam);

module.exports = router;
