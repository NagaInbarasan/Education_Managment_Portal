/**
 * Phazon Backend — Semesters Routes
 */
'use strict';

const express = require('express');
const {
  getAllSemesters,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester,
} = require('../controllers/semesterController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, getAllSemesters);
router.get('/:id', requireAuth, getSemesterById);
router.post('/', requireAuth, requireRole('admin'), createSemester);
router.put('/:id', requireAuth, requireRole('admin'), updateSemester);
router.delete('/:id', requireAuth, requireRole('admin'), deleteSemester);

module.exports = router;
