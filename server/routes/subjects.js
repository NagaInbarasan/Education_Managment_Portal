import { Router } from 'express';
import supabase from '../supabase.js';
import { authMiddleware, requireRole, canAccessSubject, isAssignedTeacher } from '../auth.js';

const router = Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/subjects — list subjects based on role
router.get('/', async (req, res) => {
  const { role, portal_id, department } = req.portalUser;
  try {
    let query = supabase.from('subjects').select('*, subject_teachers(teacher_portal_id, teacher_name, role)');

    if (role === 'student') {
      // Get enrolled subject IDs
      const { data: enrollments } = await supabase
        .from('subject_enrollments')
        .select('subject_id')
        .eq('student_portal_id', portal_id);
      const ids = (enrollments || []).map(e => e.subject_id);
      if (ids.length === 0) return res.json([]);
      query = query.in('id', ids);
    } else if (role === 'teacher') {
      const { data: assignments } = await supabase
        .from('subject_teachers')
        .select('subject_id')
        .eq('teacher_portal_id', portal_id);
      const ids = (assignments || []).map(a => a.subject_id);
      if (ids.length === 0) return res.json([]);
      query = query.in('id', ids);
    } else if (role === 'hod') {
      query = query.eq('department', department);
    }
    // admin sees all

    const { data, error } = await query.order('code');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[subjects]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/subjects/:id — subject detail
router.get('/:id', async (req, res) => {
  const canAccess = await canAccessSubject(req.portalUser, req.params.id);
  if (!canAccess) return res.status(403).json({ error: 'Not authorized to access this subject' });

  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*, subject_teachers(id, teacher_portal_id, teacher_name, role), subject_enrollments(id, student_portal_id, student_name)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[subjects]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/subjects — create subject (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  const { code, name, department, description, icon } = req.body;
  try {
    const { data, error } = await supabase
      .from('subjects')
      .insert({ code, name, department, description, icon })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[subjects]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/subjects/:id — edit subject (admin only)
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { code, name, department, description, icon } = req.body;
  try {
    const { data, error } = await supabase
      .from('subjects')
      .update({ code, name, department, description, icon, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[subjects]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// DELETE /api/subjects/:id — delete subject (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('subjects').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[subjects]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/subjects/:id/teachers — assign teacher (admin only)
router.post('/:id/teachers', requireRole('admin'), async (req, res) => {
  const { teacher_portal_id } = req.body;
  try {
    // Look up teacher from portal_users
    const { data: teacher, error: tErr } = await supabase
      .from('portal_users')
      .select('portal_id, name')
      .eq('portal_id', teacher_portal_id)
      .eq('role', 'teacher')
      .single();
    if (tErr || !teacher) return res.status(400).json({ error: 'Teacher Portal ID not found' });

    const { data, error } = await supabase
      .from('subject_teachers')
      .insert({ subject_id: req.params.id, teacher_portal_id: teacher.portal_id, teacher_name: teacher.name })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[subjects]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// DELETE /api/subjects/:id/teachers/:portalId — remove teacher (admin only)
router.delete('/:id/teachers/:portalId', requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('subject_teachers')
      .delete()
      .eq('subject_id', req.params.id)
      .eq('teacher_portal_id', req.params.portalId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[subjects]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/subjects/:id/enrollments — enroll student (admin only)
router.post('/:id/enrollments', requireRole('admin'), async (req, res) => {
  const { student_portal_id } = req.body;
  try {
    const { data: student, error: sErr } = await supabase
      .from('portal_users')
      .select('portal_id, name')
      .eq('portal_id', student_portal_id)
      .eq('role', 'student')
      .single();
    if (sErr || !student) return res.status(400).json({ error: 'Student Portal ID not found' });

    const { data, error } = await supabase
      .from('subject_enrollments')
      .insert({ subject_id: req.params.id, student_portal_id: student.portal_id, student_name: student.name })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[subjects]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// DELETE /api/subjects/:id/enrollments/:portalId — remove student (admin only)
router.delete('/:id/enrollments/:portalId', requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('subject_enrollments')
      .delete()
      .eq('subject_id', req.params.id)
      .eq('student_portal_id', req.params.portalId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[subjects]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

export default router;
