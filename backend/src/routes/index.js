/**
 * Phazon Backend — Main API Router
 *
 * All routes are prefixed with /api (applied in app.js).
 */

'use strict';

const express = require('express');
const router  = express.Router();

// ── Route imports ──────────────────────────────────────────────────
const healthRoute             = require('./health');
const dbRoute                 = require('./db');
const authRoute               = require('./auth');
const profileRoute            = require('./profile');
const academicYearsRoute      = require('./academicYears');
const semestersRoute          = require('./semesters');
const departmentsRoute        = require('./departments');
const classesRoute            = require('./classes');
const subjectsRoute           = require('./subjects');
const coursesRoute            = require('./courses');
const enrollmentsRoute        = require('./enrollments');
const teacherAssignmentsRoute = require('./teacherAssignments');
const attendanceRoute         = require('./attendance');
const assignmentsRoute        = require('./assignments');
const examsRoute              = require('./exams');
const gradesRoute             = require('./grades');
const analyticsRoute          = require('./analytics');
const aiRoute                 = require('./ai');
const notificationsRoute      = require('./notifications');
const announcementsRoute      = require('./announcements');
const resourcesRoute          = require('./resources');
const roomsRoute              = require('./rooms');
const timetableRoute          = require('./timetable');
const feesRoute               = require('./fees');
const studentRoute            = require('./student');
const campusServicesRoute     = require('./campusServices');
const searchRoute             = require('./search');
const auditRoute              = require('./audit');
const configRoute             = require('./config');

// ── Mount routes ───────────────────────────────────────────────────
router.use('/health',              healthRoute);
router.use('/db',                  dbRoute);
router.use('/auth',                authRoute);
router.use('/profile',             profileRoute);
router.use('/academic-years',      academicYearsRoute);
router.use('/semesters',           semestersRoute);
router.use('/departments',         departmentsRoute);
router.use('/classes',             classesRoute);
router.use('/subjects',            subjectsRoute);
router.use('/courses',             coursesRoute);
router.use('/enrollments',         enrollmentsRoute);
router.use('/teacher-assignments', teacherAssignmentsRoute);
router.use('/attendance',          attendanceRoute);
router.use('/assignments',         assignmentsRoute);
router.use('/exams',               examsRoute);
router.use('/grades',              gradesRoute);
router.use('/analytics',          analyticsRoute);
router.use('/ai',                  aiRoute);
router.use('/notifications',       notificationsRoute);
router.use('/announcements',       announcementsRoute);
router.use('/resources',           resourcesRoute);
router.use('/rooms',               roomsRoute);
router.use('/timetable',           timetableRoute);
router.use('/fees',                feesRoute);
router.use('/student',             studentRoute);
router.use('/campus',              campusServicesRoute);
router.use('/search',              searchRoute);
router.use('/audit',               auditRoute);
router.use('/config',              configRoute);

module.exports = router;
