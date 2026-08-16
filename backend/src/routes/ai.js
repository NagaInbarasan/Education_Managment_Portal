/**
 * Phazon Backend — AI Routes
 *
 * POST /api/ai/academic-assistant  → Context-aware academic Q&A
 * POST /api/ai/study-plan          → Personalized 7-day study plan generator
 * POST /api/ai/performance-summary → Objective performance explanation
 * POST /api/ai/exam-preparation     → Exam revision strategy generator
 */

'use strict';

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { scopeGuard } = require('../middleware/scopeGuard');
const { aiLimiter } = require('../middleware/rateLimiter');
const {
  handleAcademicAssistant,
  generateStudyPlanController,
  explainPerformanceController,
  assistExamPrepController,
} = require('../controllers/aiController');

const router = express.Router();

router.post('/academic-assistant', requireAuth, aiLimiter, scopeGuard, handleAcademicAssistant);
router.post('/study-plan', requireAuth, aiLimiter, requireRole('student', 'teacher', 'admin'), scopeGuard, generateStudyPlanController);
router.post('/performance-summary', requireAuth, aiLimiter, scopeGuard, explainPerformanceController);
router.post('/exam-preparation', requireAuth, aiLimiter, requireRole('student', 'teacher', 'admin'), scopeGuard, assistExamPrepController);

module.exports = router;
