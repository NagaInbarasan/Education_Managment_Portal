/**
 * Phazon Backend — Assignments Routes
 */

'use strict';

const express = require('express');
const {
  createAssignment,
  getAllAssignments,
  submitAssignment,
  gradeSubmission,
  getMySubmissions,
} = require('../controllers/assignmentController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, getAllAssignments);
router.post('/', requireAuth, requireRole('teacher', 'hod', 'admin'), createAssignment);
router.post('/:id/submit', requireAuth, requireRole('student'), submitAssignment);
router.put('/submissions/:submissionId/grade', requireAuth, requireRole('teacher', 'hod', 'admin'), gradeSubmission);
router.get('/my-submissions', requireAuth, getMySubmissions);

module.exports = router;
