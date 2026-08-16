/**
 * Phazon Backend — Academic Courses Routes
 */

'use strict';

const express = require('express');
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/coursesController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', getAllCourses);
router.get('/:id', getCourseById);
router.post('/', requireAuth, requireRole('admin', 'hod', 'teacher'), createCourse);
router.put('/:id', requireAuth, requireRole('admin', 'hod', 'teacher'), updateCourse);
router.delete('/:id', requireAuth, requireRole('admin', 'hod'), deleteCourse);

module.exports = router;
