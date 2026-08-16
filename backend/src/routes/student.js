/**
 * Phazon Backend — Student Experience Routes
 */

'use strict';

const express = require('express');
const {
  getStudentProfile,
  updateStudentProfile,
  getLeaveRequests,
  submitLeaveRequest,
  cancelLeaveRequest,
  reviewLeaveRequest,
  submitFeedback,
  getFeedbackAnalytics,
} = require('../controllers/studentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { scopeGuard } = require('../middleware/scopeGuard');

const router = express.Router();

// Profile
router.get('/profile', requireAuth, scopeGuard, getStudentProfile);
router.patch('/profile', requireAuth, scopeGuard, updateStudentProfile);

// Leave Management
router.get('/leave', requireAuth, scopeGuard, getLeaveRequests);
router.post('/leave', requireAuth, requireRole('student'), scopeGuard, submitLeaveRequest);
router.patch('/leave/:id/cancel', requireAuth, requireRole('student'), scopeGuard, cancelLeaveRequest);
router.patch('/leave/:id/review', requireAuth, requireRole('teacher', 'hod', 'admin'), scopeGuard, reviewLeaveRequest);

// Feedback
router.post('/feedback', requireAuth, requireRole('student'), scopeGuard, submitFeedback);
router.get('/feedback/analytics', requireAuth, requireRole('teacher', 'hod', 'admin'), scopeGuard, getFeedbackAnalytics);

module.exports = router;
