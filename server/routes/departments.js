import { Router } from 'express';
import supabase from '../supabase.js';
import { authMiddleware, requireRole, requireDepartmentAccess } from '../auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/departments — list departments
// Admin: all | HOD: only their department | Others: 403
router.get('/', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    if (role === 'admin') {
      const { data, error } = await supabase
        .from('departments')
        .select('*, sections(id, section_name, batch_year, mentor_portal_id, class_advisor_portal_id)')
        .order('department_code');
      if (error) throw error;
      return res.json(data || []);
    }

    if (role === 'hod') {
      const { data, error } = await supabase
        .from('departments')
        .select('*, sections(id, section_name, batch_year, mentor_portal_id, class_advisor_portal_id)')
        .eq('hod_portal_id', portal_id);
      if (error) throw error;
      return res.json(data || []);
    }

    // Teachers and students can see department list (names only)
    const { data, error } = await supabase
      .from('departments')
      .select('id, department_code, department_name')
      .order('department_code');
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[departments]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/departments/:deptId — department detail
router.get('/:deptId', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    const { data: dept, error } = await supabase
      .from('departments')
      .select('*, sections(id, section_name, batch_year, mentor_portal_id, class_advisor_portal_id)')
      .eq('id', req.params.deptId)
      .single();
    if (error || !dept) return res.status(404).json({ error: 'Department not found' });

    // HOD can only see their own department detail
    if (role === 'hod' && dept.hod_portal_id !== portal_id) {
      return res.status(403).json({ error: 'Access denied. Not your department.' });
    }

    // Enrich with teachers and students count per section
    if (role === 'admin' || (role === 'hod' && dept.hod_portal_id === portal_id)) {
      // Get teachers assigned to offerings in this department
      const { data: offerings } = await supabase
        .from('subject_offerings')
        .select('teacher_portal_id, section_id, subject_id, subjects(code, name), sections!inner(department_id)')
        .eq('sections.department_id', req.params.deptId)
        .eq('status', 'active');

      // Get students in sections
      for (const section of dept.sections || []) {
        const { data: students } = await supabase
          .from('portal_users')
          .select('portal_id, name, email')
          .eq('section_id', section.id)
          .eq('role', 'student');
        section.students = students || [];
        section.student_count = (students || []).length;

        // Get offerings for this section
        section.offerings = (offerings || []).filter(o => o.section_id === section.id);
      }

      dept.offerings = offerings || [];

      // Unique teachers
      const teacherIds = [...new Set((offerings || []).map(o => o.teacher_portal_id))];
      if (teacherIds.length > 0) {
        const { data: teachers } = await supabase
          .from('portal_users')
          .select('portal_id, name, email, role, department')
          .in('portal_id', teacherIds);
        dept.teachers = teachers || [];
      } else {
        dept.teachers = [];
      }
    }

    res.json(dept);
  } catch (err) {
    console.error('[departments]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/departments — create department (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  const { department_code, department_name, hod_portal_id } = req.body;
  if (!department_code || !department_name) {
    return res.status(400).json({ error: 'department_code and department_name are required' });
  }
  try {
    const { data, error } = await supabase
      .from('departments')
      .insert({ department_code, department_name, hod_portal_id: hod_portal_id || null })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[departments]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/departments/:deptId — update department (admin only)
router.put('/:deptId', requireRole('admin'), async (req, res) => {
  const { department_code, department_name, hod_portal_id } = req.body;
  try {
    const updates = { updated_at: new Date().toISOString() };
    if (department_code !== undefined) updates.department_code = department_code;
    if (department_name !== undefined) updates.department_name = department_name;
    if (hod_portal_id !== undefined) updates.hod_portal_id = hod_portal_id;

    const { data, error } = await supabase
      .from('departments')
      .update(updates)
      .eq('id', req.params.deptId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[departments]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// DELETE /api/departments/:deptId — delete (admin only, RESTRICT if has dependents)
router.delete('/:deptId', requireRole('admin'), async (req, res) => {
  try {
    // Check for dependent sections
    const { data: sections } = await supabase
      .from('sections')
      .select('id')
      .eq('department_id', req.params.deptId)
      .limit(1);
    if (sections && sections.length > 0) {
      return res.status(409).json({ error: 'Cannot delete department with existing sections. Remove sections first.' });
    }

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', req.params.deptId);
    if (error) throw error;
    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error('[departments]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

export default router;
