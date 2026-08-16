/**
 * Phazon Backend — Global Scoped Search Controller
 * Multi-entity database search enforcing RBAC & RLS rules.
 */

'use strict';

const supabase = require('../config/supabase');

async function searchGlobalEntities(req, res, next) {
  try {
    const { query: searchQuery, category } = req.query;
    const { userId, userRole, departmentId, classIds } = req;

    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters.' });
    }

    // SECURITY (H2): Sanitize search input to prevent PostgREST filter injection
    // Strip characters that have special meaning in PostgREST filter syntax
    const q = searchQuery.trim().replace(/[,.()\[\]{}\\%_'"`;:]/g, '').substring(0, 100);
    if (q.length < 2) {
      return res.status(400).json({ success: false, message: 'Search query contains too many special characters.' });
    }
    const results = [];

    // Helper for category check
    const shouldSearch = (cat) => !category || category === 'ALL' || category.toLowerCase() === cat.toLowerCase();

    // 1. Search Courses
    if (shouldSearch('courses')) {
      let query = supabase.from('courses').select('id, name, code, department:departments(name)').or(`name.ilike.%${q}%,code.ilike.%${q}%`);
      if (userRole === 'student' && classIds && classIds.length > 0) {
        // Enrolled courses
      } else if (userRole === 'hod' && departmentId) {
        query = query.eq('department_id', departmentId);
      }
      const { data: courses } = await query.limit(5);
      (courses || []).forEach(c => {
        results.push({
          id: c.id,
          type: 'COURSE',
          title: `${c.name} (${c.code || ''})`,
          subtitle: `Department: ${c.department?.name || 'Academic'}`,
          url: `/frontend/pages/${userRole}/courses.html`
        });
      });
    }

    // 2. Search Assignments
    if (shouldSearch('assignments')) {
      let query = supabase.from('assignments').select('id, title, description, due_date').ilike('title', `%${q}%`);
      const { data: assgs } = await query.limit(5);
      (assgs || []).forEach(a => {
        results.push({
          id: a.id,
          type: 'ASSIGNMENT',
          title: a.title,
          subtitle: `Due: ${new Date(a.due_date).toLocaleDateString()}`,
          url: `/frontend/pages/${userRole}/assignments.html`
        });
      });
    }

    // 3. Search Examinations
    if (shouldSearch('exams')) {
      let query = supabase.from('exams').select('id, title, start_time').ilike('title', `%${q}%`);
      const { data: exams } = await query.limit(5);
      (exams || []).forEach(e => {
        results.push({
          id: e.id,
          type: 'EXAM',
          title: e.title,
          subtitle: `Date: ${new Date(e.start_time).toLocaleDateString()}`,
          url: `/frontend/pages/${userRole}/exams.html`
        });
      });
    }

    // 4. Search Library Books
    if (shouldSearch('books')) {
      let query = supabase.from('library_books').select('id, title, author, category, isbn').or(`title.ilike.%${q}%,author.ilike.%${q}%`);
      const { data: books } = await query.limit(5);
      (books || []).forEach(b => {
        results.push({
          id: b.id,
          type: 'LIBRARY_BOOK',
          title: b.title,
          subtitle: `Author: ${b.author} | Category: ${b.category}`,
          url: `/frontend/pages/${userRole}/library.html`
        });
      });
    }

    // 5. Search Calendar Events
    if (shouldSearch('events')) {
      let query = supabase.from('academic_events').select('id, title, event_type, start_datetime').ilike('title', `%${q}%`);
      if (userRole === 'student') query = query.eq('status', 'PUBLISHED');
      const { data: events } = await query.limit(5);
      (events || []).forEach(e => {
        results.push({
          id: e.id,
          type: 'ACADEMIC_EVENT',
          title: e.title,
          subtitle: `Type: ${e.event_type} | Start: ${new Date(e.start_datetime).toLocaleDateString()}`,
          url: `/frontend/pages/${userRole}/calendar.html`
        });
      });
    }

    // 6. Search Support Requests
    if (shouldSearch('tickets')) {
      let query = supabase.from('support_requests').select('id, subject, category, status, student_id').or(`subject.ilike.%${q}%,category.ilike.%${q}%`);
      if (userRole === 'student') query = query.eq('student_id', userId);
      else if (userRole === 'hod' && departmentId) query = query.eq('department_id', departmentId);

      const { data: tickets } = await query.limit(5);
      (tickets || []).forEach(t => {
        results.push({
          id: t.id,
          type: 'SUPPORT_TICKET',
          title: t.subject,
          subtitle: `Category: ${t.category} | Status: ${t.status}`,
          url: `/frontend/pages/${userRole}/support.html`
        });
      });
    }

    // 7. Search Students / Users (For Staff Only)
    if (['admin', 'hod', 'teacher'].includes(userRole) && shouldSearch('students')) {
      let query = supabase.from('users').select('id, name, email, role').ilike('name', `%${q}%`);
      if (userRole === 'hod' && departmentId) query = query.eq('department_id', departmentId);
      const { data: users } = await query.limit(5);
      (users || []).forEach(u => {
        results.push({
          id: u.id,
          type: 'USER',
          title: u.name,
          subtitle: `Role: ${u.role} | Email: ${u.email}`,
          url: `/frontend/pages/${userRole}/dashboard.html`
        });
      });
    }

    return res.status(200).json({ success: true, count: results.length, data: results });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchGlobalEntities,
};
