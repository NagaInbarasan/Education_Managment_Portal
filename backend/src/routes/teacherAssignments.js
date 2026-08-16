/**
 * Phazon Backend — Teacher Assignments Routes
 */

'use strict';

const express = require('express');
const {
  getTeacherAssignments,
  assignTeacher,
  removeTeacherAssignment,
} = require('../controllers/teacherAssignmentController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, getTeacherAssignments);
router.post('/', requireAuth, requireRole('admin', 'hod'), assignTeacher);
router.delete('/:id', requireAuth, requireRole('admin', 'hod'), removeTeacherAssignment);

module.exports = router;
