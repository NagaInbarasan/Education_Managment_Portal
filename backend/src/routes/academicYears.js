/**
 * Phazon Backend — Academic Years Routes
 */
'use strict';

const express = require('express');
const {
  getAllAcademicYears,
  getAcademicYearById,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
} = require('../controllers/academicYearController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, getAllAcademicYears);
router.get('/:id', requireAuth, getAcademicYearById);
router.post('/', requireAuth, requireRole('admin'), createAcademicYear);
router.put('/:id', requireAuth, requireRole('admin'), updateAcademicYear);
router.delete('/:id', requireAuth, requireRole('admin'), deleteAcademicYear);

module.exports = router;
