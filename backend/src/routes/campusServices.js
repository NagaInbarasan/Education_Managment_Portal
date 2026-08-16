/**
 * Phazon Backend — Campus Academic Services Routes
 */

'use strict';

const express = require('express');
const {
  getCalendarEvents,
  createCalendarEvent,
  publishCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getLibraryBooks,
  createLibraryBook,
  addBookCopy,
  getStudentLoans,
  issueBookCopy,
  returnBookCopy,
  getSupportRequests,
  createSupportRequest,
  respondSupportRequest,
  resolveSupportRequest,
  closeSupportRequest,
} = require('../controllers/campusServicesController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { scopeGuard } = require('../middleware/scopeGuard');

const router = express.Router();

// Part A — Academic Calendar Routes
router.get('/calendar', requireAuth, scopeGuard, getCalendarEvents);
router.post('/calendar', requireAuth, requireRole('teacher', 'hod', 'admin'), scopeGuard, createCalendarEvent);
router.post('/calendar/:id/publish', requireAuth, requireRole('hod', 'admin'), scopeGuard, publishCalendarEvent);
router.patch('/calendar/:id', requireAuth, requireRole('teacher', 'hod', 'admin'), scopeGuard, updateCalendarEvent);
router.delete('/calendar/:id', requireAuth, requireRole('hod', 'admin'), deleteCalendarEvent);

// Part B — Library Management Routes
router.get('/library/books', requireAuth, getLibraryBooks);
router.post('/library/books', requireAuth, requireRole('hod', 'admin'), scopeGuard, createLibraryBook);
router.post('/library/copies', requireAuth, requireRole('hod', 'admin'), scopeGuard, addBookCopy);
router.get('/library/loans', requireAuth, scopeGuard, getStudentLoans);
router.post('/library/loans/issue', requireAuth, requireRole('hod', 'admin'), scopeGuard, issueBookCopy);
router.post('/library/loans/:id/return', requireAuth, requireRole('hod', 'admin'), scopeGuard, returnBookCopy);

// Part C — Support Ticket Routes
router.get('/support', requireAuth, scopeGuard, getSupportRequests);
router.post('/support', requireAuth, requireRole('student'), scopeGuard, createSupportRequest);
router.patch('/support/:id/respond', requireAuth, requireRole('teacher', 'hod', 'admin'), scopeGuard, respondSupportRequest);
router.patch('/support/:id/resolve', requireAuth, requireRole('teacher', 'hod', 'admin'), scopeGuard, resolveSupportRequest);
router.patch('/support/:id/close', requireAuth, scopeGuard, closeSupportRequest);

module.exports = router;
