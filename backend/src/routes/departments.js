/**
 * Phazon Backend — Departments Routes
 *
 * Authorization Matrix (Phase 4):
 *   GET  /           → Admin, HOD (list all / own dept)
 *   GET  /:id        → Admin, HOD
 *   POST /           → Admin only (create department)
 *   PUT  /:id        → Admin, HOD (HOD scoped to own dept in controller)
 *   DELETE /:id      → Admin only
 *
 * SECURITY: All routes require authentication.
 *   Role enforcement is applied here. Data-scope enforcement (HOD → own dept only)
 *   is applied in the controller layer using assertDepartmentScope().
 */

'use strict';

const express = require('express');
const {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/departmentController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// All department endpoints require authentication
router.get('/',    requireAuth, requireRole('admin', 'hod'),          getAllDepartments);
router.get('/:id', requireAuth, requireRole('admin', 'hod'),          getDepartmentById);
router.post('/',   requireAuth, requireRole('admin'),                  createDepartment);
router.put('/:id', requireAuth, requireRole('admin', 'hod'),          updateDepartment);
router.delete('/:id', requireAuth, requireRole('admin'),              deleteDepartment);

module.exports = router;
