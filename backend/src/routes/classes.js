/**
 * Phazon Backend — Classes Routes
 *
 * Authorization Matrix (Phase 4):
 *   GET  /           → Admin, HOD, Teacher (list; scoped by dept/assignment in controller)
 *   GET  /:id        → Admin, HOD, Teacher
 *   POST /           → Admin, HOD
 *   PUT  /:id        → Admin, HOD
 *   DELETE /:id      → Admin, HOD
 *
 * SECURITY: All routes require authentication.
 *   Data-scope enforcement (HOD → own dept, Teacher → assigned classes only)
 *   is applied in the controller layer using assertClassScope() / assertDepartmentScope().
 */

'use strict';

const express = require('express');
const {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
} = require('../controllers/classController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/',       requireAuth, requireRole('admin', 'hod', 'teacher'), getAllClasses);
router.get('/:id',    requireAuth, requireRole('admin', 'hod', 'teacher'), getClassById);
router.post('/',      requireAuth, requireRole('admin', 'hod'),             createClass);
router.put('/:id',    requireAuth, requireRole('admin', 'hod'),             updateClass);
router.delete('/:id', requireAuth, requireRole('admin', 'hod'),             deleteClass);

module.exports = router;
