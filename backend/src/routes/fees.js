/**
 * Phazon Backend — Fees & Finance Routes
 */

'use strict';

const express = require('express');
const {
  getFeeStructures,
  createFeeStructure,
  assignStudentFee,
  getMyFees,
  getMyPayments,
  recordPayment,
  getReceipt,
  getFinanceDashboard,
} = require('../controllers/feeController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { scopeGuard } = require('../middleware/scopeGuard');

const router = express.Router();

router.get('/structures', requireAuth, getFeeStructures);
router.post('/structures', requireAuth, requireRole('hod', 'admin'), scopeGuard, createFeeStructure);
router.post('/assign', requireAuth, requireRole('hod', 'admin'), scopeGuard, assignStudentFee);

router.get('/my-fees', requireAuth, scopeGuard, getMyFees);
router.get('/my-payments', requireAuth, scopeGuard, getMyPayments);

router.post('/payments', requireAuth, requireRole('hod', 'admin'), scopeGuard, recordPayment);
router.get('/payments/:id/receipt', requireAuth, scopeGuard, getReceipt);

router.get('/dashboard', requireAuth, requireRole('hod', 'admin'), scopeGuard, getFinanceDashboard);

module.exports = router;
