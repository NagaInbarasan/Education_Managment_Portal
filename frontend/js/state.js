/**
 * Phazon State Manager
 * Central localStorage wrapper for Academic Management System.
 */

const PZ_KEYS = {
  USER: 'pz_user',
  ROLE: 'pz_role',
  DEPARTMENT: 'pz_department',
  CLASS: 'pz_class',
  STREAK: 'pz_streak',
  LAST_VISIT: 'pz_last_visit',
  COURSE_PROGRESS: 'pz_course_progress',
  COMPLETED_COURSES: 'pz_completed_courses',
  CURRENT_COURSE: 'pz_current_course',
  AI_ACADEMIC_CACHE: 'pz_ai_academic_cache',
};

const PzState = {
  // ── Generic ──────────────────────────────────────────────────────
  get(key) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : null;
    } catch { return null; }
  },

  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },

  remove(key) { localStorage.removeItem(key); },

  // ── User & Role ──────────────────────────────────────────────────
  getUser()       { return this.get(PZ_KEYS.USER) || { name: 'Student', email: 'student@phazon.edu' }; },
  setUser(user)   { this.set(PZ_KEYS.USER, user); },

  getRole()       { return this.get(PZ_KEYS.ROLE) || 'student'; },
  setRole(role)   { this.set(PZ_KEYS.ROLE, role); },

  getDepartment()     { return this.get(PZ_KEYS.DEPARTMENT) || null; },
  setDepartment(dept) { this.set(PZ_KEYS.DEPARTMENT, dept); },

  getClass()          { return this.get(PZ_KEYS.CLASS) || null; },
  setClass(cls)       { this.set(PZ_KEYS.CLASS, cls); },

  // ── Course Progress ───────────────────────────────────────────────
  getCourseProgress() { return this.get(PZ_KEYS.COURSE_PROGRESS) || {}; },
  setCourseProgress(progress) { this.set(PZ_KEYS.COURSE_PROGRESS, progress); },

  updateCourseLesson(courseId, lessonId) {
    const progress = this.getCourseProgress();
    if (!progress[courseId]) progress[courseId] = { completedLessons: [] };
    if (!progress[courseId].completedLessons.includes(lessonId)) {
      progress[courseId].completedLessons.push(lessonId);
    }
    this.setCourseProgress(progress);
  },

  getCoursePercent(courseId, totalLessons) {
    const progress = this.getCourseProgress();
    const completed = progress[courseId]?.completedLessons?.length || 0;
    return totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
  },

  getCompletedCourses() { return this.get(PZ_KEYS.COMPLETED_COURSES) || []; },
  setCompletedCourses(ids) { this.set(PZ_KEYS.COMPLETED_COURSES, ids); },
  isCourseComplete(courseId) { return this.getCompletedCourses().includes(courseId); },
  markCourseComplete(courseId) {
    const completed = this.getCompletedCourses();
    if (!completed.includes(courseId)) {
      completed.push(courseId);
      this.setCompletedCourses(completed);
      return true;
    }
    return false;
  },

  getCurrentCourse() { return this.get(PZ_KEYS.CURRENT_COURSE) || null; },
  setCurrentCourse(courseId, lessonId) {
    this.set(PZ_KEYS.CURRENT_COURSE, { courseId, lessonId });
  },

  // ── Study Streak ──────────────────────────────────────────────────
  getStreak() { return this.get(PZ_KEYS.STREAK) || 1; },

  updateStreak() {
    const today = new Date().toDateString();
    const last = this.get(PZ_KEYS.LAST_VISIT);
    const streak = this.getStreak();
    if (last !== today) {
      this.set(PZ_KEYS.LAST_VISIT, today);
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const newStreak = last === yesterday ? streak + 1 : 1;
      this.set(PZ_KEYS.STREAK, newStreak);
    }
  },

  // ── AI Academic Cache ─────────────────────────────────────────────
  getAIAcademicCache()      { return this.get(PZ_KEYS.AI_ACADEMIC_CACHE) || null; },
  setAIAcademicCache(cache) { this.set(PZ_KEYS.AI_ACADEMIC_CACHE, cache); },
  clearAIAcademicCache()    { this.remove(PZ_KEYS.AI_ACADEMIC_CACHE); },

  // ── Reset ────────────────────────────────────────────────────────
  resetAll() {
    Object.values(PZ_KEYS).forEach(k => localStorage.removeItem(k));
  },
};

window.PzState = PzState;
window.PZ_KEYS = PZ_KEYS;
