import { Router } from 'express';
import supabase from '../supabase.js';
import { authMiddleware, requireRole, isDepartmentHod, requireDepartmentAccess } from '../auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/sections/my/advised — list sections where logged-in user is advisor or mentor
router.get('/sections/my/advised', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    if (role !== 'teacher') return res.json([]);
    const { data, error } = await supabase
      .from('sections')
      .select('id, section_name, department_id, batch_year, class_advisor_portal_id, mentor_portal_id, departments(department_code, department_name)')
      .or(`class_advisor_portal_id.eq.${portal_id},mentor_portal_id.eq.${portal_id}`);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[sections]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/departments/:deptId/sections — list sections for a department
router.get('/departments/:deptId/sections', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  const { deptId } = req.params;
  try {
    // HOD can only see their own department's sections
    if (role === 'hod') {
      const isHod = await isDepartmentHod(portal_id, deptId);
      if (!isHod) return res.status(403).json({ error: 'Access denied. Not your department.' });
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('department_id', deptId)
      .order('batch_year', { ascending: false })
      .order('section_name');
    if (error) throw error;

    // Enrich with student counts
    for (const section of data || []) {
      const { count } = await supabase
        .from('portal_users')
        .select('*', { count: 'exact', head: true })
        .eq('section_id', section.id)
        .eq('role', 'student');
      section.student_count = count || 0;
    }

    res.json(data || []);
  } catch (err) {
    console.error('[sections]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/departments/:deptId/sections — create section
router.post('/departments/:deptId/sections', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  const { deptId } = req.params;
  try {
    if (role === 'hod') {
      const isHod = await isDepartmentHod(portal_id, deptId);
      if (!isHod) return res.status(403).json({ error: 'Access denied. Not your department.' });
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { section_name, batch_year, mentor_portal_id, class_advisor_portal_id } = req.body;
    if (!section_name || !batch_year) {
      return res.status(400).json({ error: 'section_name and batch_year are required' });
    }

    const { data, error } = await supabase
      .from('sections')
      .insert({
        department_id: deptId,
        section_name,
        batch_year,
        mentor_portal_id: mentor_portal_id || null,
        class_advisor_portal_id: class_advisor_portal_id || null,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[sections]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/sections/:id — section detail
router.get('/sections/:id', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    const { data: section, error } = await supabase
      .from('sections')
      .select('*, departments(id, department_code, department_name, hod_portal_id)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!section) return res.status(404).json({ error: 'Section not found' });

    // Authorization
    if (role === 'hod') {
      const isHod = await isDepartmentHod(portal_id, section.department_id);
      if (!isHod) return res.status(403).json({ error: 'Access denied. Not your department.' });
    } else if (role === 'student') {
      if (req.portalUser.section_id !== section.id) return res.status(403).json({ error: 'Access denied. Not your section.' });
    } else if (role === 'teacher') {
      // Teachers can view section details if they teach in it or are advisors/mentors
      const isAdvisor = section.class_advisor_portal_id === portal_id || section.mentor_portal_id === portal_id;
      if (!isAdvisor) {
        const { data: teachings } = await supabase.from('subject_offerings').select('id').eq('section_id', section.id).eq('teacher_portal_id', portal_id);
        if (!teachings || teachings.length === 0) return res.status(403).json({ error: 'Access denied.' });
      }
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Enrich with students
    const { data: students } = await supabase
      .from('portal_users')
      .select('portal_id, name, email, batch_year')
      .eq('section_id', section.id)
      .eq('role', 'student')
      .order('name');
    section.students = students || [];

    // Enrich with offerings
    const { data: offerings } = await supabase
      .from('subject_offerings')
      .select('*, subjects(code, name, icon)')
      .eq('section_id', section.id)
      .eq('status', 'active')
      .order('created_at');
    section.offerings = offerings || [];

    res.json(section);
  } catch (err) {
    console.error('[sections]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/sections/:id — update section
router.put('/sections/:id', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    // Get section to find department
    const { data: section } = await supabase
      .from('sections')
      .select('department_id')
      .eq('id', req.params.id)
      .single();
    if (!section) return res.status(404).json({ error: 'Section not found' });

    if (role === 'hod') {
      const isHod = await isDepartmentHod(portal_id, section.department_id);
      if (!isHod) return res.status(403).json({ error: 'Access denied. Not your department.' });
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { section_name, batch_year, mentor_portal_id, class_advisor_portal_id } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (section_name !== undefined) updates.section_name = section_name;
    if (batch_year !== undefined) updates.batch_year = batch_year;
    if (mentor_portal_id !== undefined) updates.mentor_portal_id = mentor_portal_id;
    if (class_advisor_portal_id !== undefined) updates.class_advisor_portal_id = class_advisor_portal_id;

    const { data, error } = await supabase
      .from('sections')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[sections]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// DELETE /api/sections/:id — delete section (admin only, safe)
router.delete('/sections/:id', requireRole('admin'), async (req, res) => {
  try {
    // Check for dependent students
    const { count: studentCount } = await supabase
      .from('portal_users')
      .select('*', { count: 'exact', head: true })
      .eq('section_id', req.params.id);
    if (studentCount > 0) {
      return res.status(409).json({ error: `Cannot delete section with ${studentCount} students. Remove students first.` });
    }

    // Check for dependent offerings
    const { count: offeringCount } = await supabase
      .from('subject_offerings')
      .select('*', { count: 'exact', head: true })
      .eq('section_id', req.params.id);
    if (offeringCount > 0) {
      return res.status(409).json({ error: `Cannot delete section with ${offeringCount} subject offerings. Remove offerings first.` });
    }

    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Section deleted' });
  } catch (err) {
    console.error('[sections]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/sections/:id/students — list students in section
router.get('/sections/:id/students', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    const { data: section } = await supabase
      .from('sections')
      .select('department_id')
      .eq('id', req.params.id)
      .single();
    if (!section) return res.status(404).json({ error: 'Section not found' });

    // Teachers assigned to this section can view students
    if (role === 'teacher' || role === 'hod') {
      const { data: offering } = await supabase
        .from('subject_offerings')
        .select('id')
        .eq('section_id', req.params.id)
        .eq('teacher_portal_id', portal_id)
        .limit(1);
      
      const isAssignedTeacher = offering && offering.length > 0;
      const isHod = role === 'hod' && await isDepartmentHod(portal_id, section.department_id);
      
      if (!isAssignedTeacher && !isHod && role !== 'admin') {
        return res.status(403).json({ error: 'Access denied.' });
      }
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { data, error } = await supabase
      .from('portal_users')
      .select('portal_id, name, email, batch_year')
      .eq('section_id', req.params.id)
      .eq('role', 'student')
      .order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[sections]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

export default router;
