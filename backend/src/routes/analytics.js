/**
 * Phazon Backend — Analytics Routes
 */

'use strict';

const express = require('express');
const {
  getStudentAnalytics,
  getTeacherAnalytics,
  getHodAnalytics,
  getAdminAnalytics,
  getFeeAnalytics,
  getRiskAnalytics,
  exportAnalyticsReport,
} = require('../controllers/analyticsController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { scopeGuard } = require('../middleware/scopeGuard');

const router = express.Router();

router.get('/student', requireAuth, scopeGuard, getStudentAnalytics);
router.get('/teacher', requireAuth, requireRole('teacher', 'hod', 'admin'), scopeGuard, getTeacherAnalytics);
router.get('/hod', requireAuth, requireRole('hod', 'admin'), scopeGuard, getHodAnalytics);
router.get('/admin', requireAuth, requireRole('admin'), scopeGuard, getAdminAnalytics);

// Specialized Phase 18 Analytics & Management Intelligence Endpoints
router.get('/department', requireAuth, requireRole('hod', 'admin'), scopeGuard, getHodAnalytics);
router.get('/fees', requireAuth, requireRole('hod', 'admin'), scopeGuard, getFeeAnalytics);
router.get('/risk', requireAuth, requireRole('teacher', 'hod', 'admin'), scopeGuard, getRiskAnalytics);
router.get('/export', requireAuth, requireRole('hod', 'admin'), scopeGuard, exportAnalyticsReport);

module.exports = router;
