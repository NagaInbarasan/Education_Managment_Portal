import { Router } from 'express';
import supabase from '../supabase.js';
import { authMiddleware, requireRole, isDepartmentHod, getHodDepartmentId } from '../auth.js';
import { createNotificationsBulk } from './notifications.js';

const router = Router();
router.use(authMiddleware);

// GET /api/offerings — list offerings for the logged-in teacher/hod
router.get('/', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    if (role === 'admin') {
      const { data, error } = await supabase
        .from('subject_offerings')
        .select('*, subjects(id, code, name, icon, description), sections(id, section_name, batch_year, department_id, departments(id, department_code, department_name))')
        .eq('status', 'active')
        .order('created_at');
      if (error) throw error;
      return res.json(data || []);
    }

    if (role === 'hod') {
      // HOD sees ALL offerings in their department
      const hodDeptId = await getHodDepartmentId(portal_id);
      if (hodDeptId) {
        const { data, error } = await supabase
          .from('subject_offerings')
          .select('*, subjects(id, code, name, icon, description), sections!inner(id, section_name, batch_year, department_id, departments(id, department_code, department_name))')
          .eq('sections.department_id', hodDeptId)
          .eq('status', 'active')
          .order('created_at');
        if (error) throw error;
        return res.json(data || []);
      }
      return res.json([]);
    }

    if (role === 'teacher') {
      // Teacher: only their own teaching assignments
      const { data: teaching, error } = await supabase
        .from('subject_offerings')
        .select('*, subjects(id, code, name, icon, description), sections(id, section_name, batch_year, department_id, departments(id, department_code, department_name))')
        .eq('teacher_portal_id', portal_id)
        .eq('status', 'active')
        .order('created_at');
      if (error) throw error;
      return res.json(teaching || []);
    }

    if (role === 'student') {
      // Get offerings for student's section
      const sectionId = req.portalUser.section_id;
      if (!sectionId) return res.json([]);

      const { data, error } = await supabase
        .from('subject_offerings')
        .select('*, subjects(id, code, name, icon, description), sections(id, section_name, batch_year, department_id, departments(id, department_code, department_name))')
        .eq('section_id', sectionId)
        .eq('status', 'active')
        .order('created_at');
      if (error) throw error;
      return res.json(data || []);
    }

    return res.json([]);
  } catch (err) {
    console.error('[offerings]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/offerings/:id — offering detail
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subject_offerings')
      .select('*, subjects(id, code, name, icon, description, department), sections(id, section_name, batch_year, department_id, mentor_portal_id, class_advisor_portal_id, departments(id, department_code, department_name, hod_portal_id))')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Offering not found' });

    // Get teacher info
    const { data: teacher } = await supabase
      .from('portal_users')
      .select('portal_id, name, email')
      .eq('portal_id', data.teacher_portal_id)
      .single();
    data.teacher = teacher;

    res.json(data);
  } catch (err) {
    console.error('[offerings]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/sections/:sectionId/offerings — list offerings for a section
router.get('/section/:sectionId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subject_offerings')
      .select('*, subjects(id, code, name, icon, description)')
      .eq('section_id', req.params.sectionId)
      .eq('status', 'active')
      .order('created_at');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[offerings]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/offerings — create offering (admin or dept HOD)
router.post('/', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    const { subject_id, section_id, teacher_portal_id, academic_year } = req.body;
    if (!subject_id || !section_id || !teacher_portal_id) {
      return res.status(400).json({ error: 'subject_id, section_id, and teacher_portal_id are required' });
    }

    // Get section's department to verify HOD access
    const { data: section } = await supabase
      .from('sections')
      .select('department_id')
      .eq('id', section_id)
      .single();
    if (!section) return res.status(404).json({ error: 'Section not found' });

    if (role === 'hod') {
      const isHod = await isDepartmentHod(portal_id, section.department_id);
      if (!isHod) return res.status(403).json({ error: 'Access denied. Not your department.' });
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { data, error } = await supabase
      .from('subject_offerings')
      .insert({
        subject_id,
        section_id,
        teacher_portal_id,
        academic_year: academic_year || '2026-2027',
        status: 'active',
      })
      .select('*, subjects(code, name), sections(section_name, batch_year, departments(department_code, department_name))')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[offerings]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/offerings/:id — update offering
router.put('/:id', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    // Get offering to find section's department
    const { data: offering } = await supabase
      .from('subject_offerings')
      .select('section_id, sections(department_id)')
      .eq('id', req.params.id)
      .single();
    if (!offering) return res.status(404).json({ error: 'Offering not found' });

    if (role === 'hod') {
      const isHod = await isDepartmentHod(portal_id, offering.sections.department_id);
      if (!isHod) return res.status(403).json({ error: 'Access denied. Not your department.' });
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { teacher_portal_id, academic_year, status } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (teacher_portal_id !== undefined) updates.teacher_portal_id = teacher_portal_id;
    if (academic_year !== undefined) updates.academic_year = academic_year;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('subject_offerings')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, subjects(code, name), sections(section_name, batch_year, departments(department_code, department_name))')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[offerings]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/offerings/:id/reassign-teacher — reassign teacher (with event log)
router.put('/:id/reassign-teacher', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    const { new_teacher_portal_id } = req.body;
    if (!new_teacher_portal_id) {
      return res.status(400).json({ error: 'new_teacher_portal_id is required' });
    }

    // Get offering details
    const { data: offering } = await supabase
      .from('subject_offerings')
      .select('*, sections(department_id)')
      .eq('id', req.params.id)
      .single();
    if (!offering) return res.status(404).json({ error: 'Offering not found' });

    if (role === 'hod') {
      const isHod = await isDepartmentHod(portal_id, offering.sections.department_id);
      if (!isHod) return res.status(403).json({ error: 'Access denied. Not your department.' });
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Verify new teacher exists
    const { data: newTeacher } = await supabase
      .from('portal_users')
      .select('portal_id, name')
      .eq('portal_id', new_teacher_portal_id)
      .single();
    if (!newTeacher) return res.status(404).json({ error: 'New teacher not found' });

    const oldTeacher = offering.teacher_portal_id;

    // Update offering
    const { data: updated, error } = await supabase
      .from('subject_offerings')
      .update({
        teacher_portal_id: new_teacher_portal_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select('*, subjects(code, name), sections(section_name, batch_year)')
      .single();
    if (error) throw error;

    // Update timetable entries to reflect new teacher (the offering still references same teacher via offering_id)
    // No timetable change needed since timetable points to offering, not directly to teacher

    res.json({
      ...updated,
      reassignment: {
        old_teacher_portal_id: oldTeacher,
        new_teacher_portal_id: new_teacher_portal_id,
        new_teacher_name: newTeacher.name,
        timestamp: new Date().toISOString(),
        // This event can be consumed by the notification system in a future phase
      }
    });
  } catch (err) {
    console.error('[offerings]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// DELETE /api/offerings/:id — delete offering (admin only, safe)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    // Check for dependent timetable entries
    const { count: ttCount } = await supabase
      .from('timetable_entries')
      .select('*', { count: 'exact', head: true })
      .eq('offering_id', req.params.id);
    if (ttCount > 0) {
      return res.status(409).json({ error: `Cannot delete offering with ${ttCount} timetable entries. Remove timetable entries first.` });
    }

    // Check for dependent assignments
    const { count: asgCount } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('offering_id', req.params.id);
    if (asgCount > 0) {
      return res.status(409).json({ error: `Cannot delete offering with ${asgCount} assignments.` });
    }

    const { error } = await supabase
      .from('subject_offerings')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Offering deleted' });
  } catch (err) {
    console.error('[offerings]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// ============================================
// SUBJECT DOCUMENTS (Materials)
// ============================================

// GET /api/offerings/:id/documents
router.get('/:id/documents', async (req, res) => {
  try {
    const { data: offering, error: offErr } = await supabase.from('subject_offerings').select('id, section_id, teacher_portal_id, sections(department_id)').eq('id', req.params.id).single();
    if (offErr || !offering) return res.status(404).json({ error: 'Offering not found' });

    // Enforce offering scope
    const { role, portal_id, section_id } = req.portalUser;
    if (role === 'teacher' && offering.teacher_portal_id !== portal_id) return res.status(403).json({ error: 'Not authorized for this offering' });
    if (role === 'hod') {
      const hodDeptId = await getHodDepartmentId(portal_id);
      if (!hodDeptId || offering.sections?.department_id !== hodDeptId) return res.status(403).json({ error: 'Not authorized for this offering' });
    }
    if (role === 'student' && offering.section_id !== section_id) return res.status(403).json({ error: 'Not authorized for this offering' });

    const { data, error } = await supabase
      .from('subject_documents')
      .select('*')
      .eq('offering_id', req.params.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[offerings]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// DELETE /api/offerings/:id/documents/:docId
router.delete('/:id/documents/:docId', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    const { data: doc } = await supabase
      .from('subject_documents')
      .select('uploaded_by, storage_path, offering_id')
      .eq('id', req.params.docId)
      .single();

    if (!doc || doc.offering_id !== req.params.id) return res.status(404).json({ error: 'Document not found in this offering' });

    if (role !== 'admin' && doc.uploaded_by !== portal_id) {
      return res.status(403).json({ error: 'Only the uploader or admin can delete this document' });
    }

    await supabase.storage.from('documents').remove([doc.storage_path]);
    const { error } = await supabase.from('subject_documents').delete().eq('id', req.params.docId);
    if (error) throw error;
    
    // Ignore text chunk errors if table missing
    await supabase.from('document_text_chunks').delete().eq('document_id', req.params.docId).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    console.error('[offerings]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});


// ============================================
// ANNOUNCEMENTS
// ============================================

// GET /api/offerings/:id/announcements
router.get('/:id/announcements', async (req, res) => {
  try {
    const { data: offering, error: offErr } = await supabase.from('subject_offerings').select('id, section_id, teacher_portal_id, sections(department_id)').eq('id', req.params.id).single();
    if (offErr || !offering) return res.status(404).json({ error: 'Offering not found' });

    const { role, portal_id, section_id } = req.portalUser;
    if (role === 'teacher' && offering.teacher_portal_id !== portal_id) return res.status(403).json({ error: 'Not authorized for this offering' });
    if (role === 'hod') {
      const hodDeptId = await getHodDepartmentId(portal_id);
      if (!hodDeptId || offering.sections?.department_id !== hodDeptId) return res.status(403).json({ error: 'Not authorized for this offering' });
    }
    if (role === 'student' && offering.section_id !== section_id) return res.status(403).json({ error: 'Not authorized for this offering' });

    const { data, error } = await supabase
      .from('subject_announcements')
      .select('*')
      .eq('offering_id', req.params.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[offerings]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/offerings/:id/announcements
router.post('/:id/announcements', async (req, res) => {
  const { role, portal_id, name } = req.portalUser;
  if (role !== 'teacher' && role !== 'admin') return res.status(403).json({ error: 'Only teachers can create announcements' });

  try {
    const { data: offering, error: offErr } = await supabase.from('subject_offerings').select('id, subject_id, teacher_portal_id').eq('id', req.params.id).single();
    if (offErr || !offering) return res.status(404).json({ error: 'Offering not found' });

    if (role === 'teacher' && offering.teacher_portal_id !== portal_id) {
      return res.status(403).json({ error: 'Not assigned to this offering' });
    }

    const { title, content } = req.body;
    const { data, error } = await supabase
      .from('subject_announcements')
      .insert({ offering_id: req.params.id, subject_id: offering.subject_id, title, content, posted_by: portal_id, posted_by_name: name })
      .select()
      .single();
    if (error) throw error;

    // Generate notifications for students in this offering's section
    const { data: offDetails } = await supabase.from('subject_offerings').select('section_id, subjects(name)').eq('id', req.params.id).single();
    if (offDetails && offDetails.section_id) {
      const { data: students } = await supabase.from('portal_users').select('portal_id').eq('section_id', offDetails.section_id).eq('role', 'student');
      if (students) {
        const recipients = students.map(s => s.portal_id);
        const subjName = offDetails.subjects?.name || 'Subject';
        await createNotificationsBulk(
          recipients,
          portal_id,
          'announcement',
          `New Announcement in ${subjName}`,
          title,
          'offering',
          req.params.id
        );
      }
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('[offerings]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/offerings/:id/announcements/:annId
router.put('/:id/announcements/:annId', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    const { data: ann } = await supabase
      .from('subject_announcements')
      .select('posted_by, offering_id')
      .eq('id', req.params.annId)
      .single();

    if (!ann || ann.offering_id !== req.params.id) return res.status(404).json({ error: 'Announcement not found in this offering' });
    if (role !== 'admin' && ann.posted_by !== portal_id) {
      return res.status(403).json({ error: 'Only the author can edit this announcement' });
    }

    const { title, content } = req.body;
    const { data, error } = await supabase
      .from('subject_announcements')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', req.params.annId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[offerings]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// DELETE /api/offerings/:id/announcements/:annId
router.delete('/:id/announcements/:annId', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    const { data: ann } = await supabase
      .from('subject_announcements')
      .select('posted_by, offering_id')
      .eq('id', req.params.annId)
      .single();

    if (!ann || ann.offering_id !== req.params.id) return res.status(404).json({ error: 'Announcement not found in this offering' });
    if (role !== 'admin' && ann.posted_by !== portal_id) {
      return res.status(403).json({ error: 'Only the author or admin can delete' });
    }

    const { error } = await supabase.from('subject_announcements').delete().eq('id', req.params.annId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[offerings]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

export default router;
