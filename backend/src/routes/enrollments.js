/**
 * Phazon Backend — Enrollments Routes
 */

'use strict';

const express = require('express');
const {
  getEnrollments,
  enrollStudent,
  removeEnrollment,
} = require('../controllers/enrollmentController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, getEnrollments);
router.post('/', requireAuth, requireRole('admin', 'hod', 'teacher'), enrollStudent);
router.delete('/:id', requireAuth, requireRole('admin', 'hod'), removeEnrollment);

module.exports = router;
