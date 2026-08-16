/**
 * Phazon Backend — Subjects Routes
 *
 * Authorization Matrix (Phase 4):
 *   GET  /           → Admin, HOD, Teacher (list; dept-scoped in controller)
 *   GET  /:id        → Admin, HOD, Teacher
 *   POST /           → Admin, HOD
 *   PUT  /:id        → Admin, HOD
 *   DELETE /:id      → Admin, HOD
 *
 * SECURITY: All routes require authentication.
 *   Data-scope enforcement (HOD → own dept subjects only) is applied in the controller
 *   using assertDepartmentScope().
 */

'use strict';

const express = require('express');
const {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
} = require('../controllers/subjectController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/',       requireAuth, requireRole('admin', 'hod', 'teacher'), getAllSubjects);
router.get('/:id',    requireAuth, requireRole('admin', 'hod', 'teacher'), getSubjectById);
router.post('/',      requireAuth, requireRole('admin', 'hod'),             createSubject);
router.put('/:id',    requireAuth, requireRole('admin', 'hod'),             updateSubject);
router.delete('/:id', requireAuth, requireRole('admin', 'hod'),             deleteSubject);

module.exports = router;
