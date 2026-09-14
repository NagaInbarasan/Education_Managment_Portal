import { Router } from 'express';
import supabase from '../supabase.js';
import { authMiddleware, requireRole, canAccessSubject, isAssignedTeacher, getHodDepartmentId } from '../auth.js';
import { createNotificationsBulk } from './notifications.js';

const router = Router();
router.use(authMiddleware);

// GET /api/offerings/:offeringId/assignments
router.get('/offerings/:offeringId/assignments', async (req, res) => {
  const { role, portal_id, section_id } = req.portalUser;
  try {
    const { data: offering, error: offErr } = await supabase.from('subject_offerings').select('id, section_id, teacher_portal_id, sections(department_id)').eq('id', req.params.offeringId).single();
    if (offErr || !offering) return res.status(404).json({ error: 'Offering not found' });

    if (role === 'teacher' && offering.teacher_portal_id !== portal_id) return res.status(403).json({ error: 'Not authorized for this offering' });
    if (role === 'hod') {
      const hodDeptId = await getHodDepartmentId(portal_id);
      if (!hodDeptId || offering.sections?.department_id !== hodDeptId) return res.status(403).json({ error: 'Not authorized for this offering' });
    }
    if (role === 'student' && offering.section_id !== section_id) return res.status(403).json({ error: 'Not authorized for this offering' });

    let query = supabase
      .from('assignments')
      .select('*')
      .eq('offering_id', req.params.offeringId)
      .order('created_at', { ascending: false });

    // Students only see published/closed assignments
    if (role === 'student') {
      query = query.in('status', ['published', 'closed']);
    }

    const { data, error } = await query;
    if (error) throw error;

    // For students, attach their own submission status
    if (role === 'student' && data && data.length > 0) {
      const assignmentIds = data.map(a => a.id);
      const { data: subs } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, status, marks_obtained, feedback, submitted_at, graded_at')
        .eq('student_portal_id', portal_id)
        .in('assignment_id', assignmentIds);

      const subMap = {};
      (subs || []).forEach(s => { subMap[s.assignment_id] = s; });
      data.forEach(a => { a.my_submission = subMap[a.id] || null; });
    }

    res.json(data || []);
  } catch (err) {
    console.error('[assignments]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/assignments/:id — single assignment detail
router.get('/assignments/:id', async (req, res) => {
  try {
    const { data: assignment, error } = await supabase
      .from('assignments')
      .select('*, subjects(code, name), subject_offerings(section_id, teacher_portal_id)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const { role, portal_id, section_id } = req.portalUser;
    const offering = assignment.subject_offerings;
    
    if (role === 'teacher' && offering.teacher_portal_id !== portal_id) return res.status(403).json({ error: 'Not authorized for this offering' });
    if (role === 'student' && offering.section_id !== section_id) return res.status(403).json({ error: 'Not authorized for this offering' });

    // Students: only published/closed
    if (role === 'student' && assignment.status === 'draft') {
      return res.status(403).json({ error: 'Assignment not available' });
    }

    res.json(assignment);
  } catch (err) {
    console.error('[assignments]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/offerings/:offeringId/assignments — create assignment (teacher/admin)
router.post('/offerings/:offeringId/assignments', async (req, res) => {
  const { role, portal_id, name } = req.portalUser;
  if (role !== 'teacher' && role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  try {
    const { data: offering, error: offErr } = await supabase.from('subject_offerings').select('id, subject_id, teacher_portal_id').eq('id', req.params.offeringId).single();
    if (offErr || !offering) return res.status(404).json({ error: 'Offering not found' });

    if (role === 'teacher' && offering.teacher_portal_id !== portal_id) {
      return res.status(403).json({ error: 'Not assigned to this offering' });
    }

    const { title, description, instructions, unit_or_module, due_date, max_marks, status } = req.body;
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        offering_id: req.params.offeringId,
        subject_id: offering.subject_id,
        title,
        description,
        instructions,
        unit_or_module,
        due_date,
        max_marks: max_marks || 100,
        status: status || 'draft',
        created_by: portal_id
      })
      .select()
      .single();
    if (error) throw error;

    if (data.status === 'published') {
      const { data: offDetails } = await supabase.from('subject_offerings').select('section_id, subjects(name)').eq('id', req.params.offeringId).single();
      if (offDetails && offDetails.section_id) {
        const { data: students } = await supabase.from('portal_users').select('portal_id').eq('section_id', offDetails.section_id).eq('role', 'student');
        if (students) {
          const recipients = students.map(s => s.portal_id);
          const subjName = offDetails.subjects?.name || 'Subject';
          await createNotificationsBulk(
            recipients,
            portal_id,
            'assignment',
            `New Assignment: ${title}`,
            `A new assignment has been posted for ${subjName}. Due: ${due_date || 'No due date'}`,
            'offering',
            req.params.offeringId
          );
        }
      }
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('[assignments]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/assignments/:id — edit assignment (teacher who created / admin)
router.put('/assignments/:id', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    const { data: assignment } = await supabase
      .from('assignments')
      .select('created_by_portal_id, subject_id')
      .eq('id', req.params.id)
      .single();
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    if (role === 'teacher') {
      const assigned = await isAssignedTeacher(portal_id, assignment.subject_id);
      if (!assigned) return res.status(403).json({ error: 'Not assigned to this subject' });
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, description, instructions, unit_or_module, due_date, max_marks, status } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (instructions !== undefined) updates.instructions = instructions;
    if (unit_or_module !== undefined) updates.unit_or_module = unit_or_module;
    if (due_date !== undefined) updates.due_date = due_date;
    if (max_marks !== undefined) updates.max_marks = max_marks;
    if (status !== undefined) updates.status = status;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[assignments]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/assignments/:id/submit — student submit assignment
router.post('/assignments/:id/submit', async (req, res) => {
  const { role, portal_id, name } = req.portalUser;
  if (role !== 'student') return res.status(403).json({ error: 'Only students can submit' });

  try {
    const { data: assignment } = await supabase
      .from('assignments')
      .select('subject_id, status, due_date')
      .eq('id', req.params.id)
      .single();
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    if (assignment.status !== 'published') {
      return res.status(400).json({ error: 'Assignment is not open for submission' });
    }

    const enrolled = await canAccessSubject(req.portalUser, assignment.subject_id);
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled in this subject' });

    // Check if already submitted — upsert (allows resubmission before deadline)
    const { submission_text } = req.body;

    const { data: existing } = await supabase
      .from('assignment_submissions')
      .select('id, status')
      .eq('assignment_id', req.params.id)
      .eq('student_portal_id', portal_id)
      .single();

    if (existing) {
      // Allow resubmission only if not yet graded
      if (existing.status === 'graded' || existing.status === 'returned') {
        return res.status(400).json({ error: 'Cannot resubmit after grading' });
      }
      const { data, error } = await supabase
        .from('assignment_submissions')
        .update({ submission_text: submission_text || 'Resubmitted', submitted_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    const { data, error } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id: req.params.id,
        student_portal_id: portal_id,
        student_name: name,
        submission_text: submission_text || 'Submitted',
        status: 'submitted'
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[assignments]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/assignments/:id/submissions — teacher view all submissions
router.get('/assignments/:id/submissions', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    const { data: assignment } = await supabase
      .from('assignments')
      .select('subject_id')
      .eq('id', req.params.id)
      .single();
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    if (role === 'teacher') {
      const assigned = await isAssignedTeacher(portal_id, assignment.subject_id);
      if (!assigned) return res.status(403).json({ error: 'Not assigned to this subject' });
    } else if (role === 'hod') {
      const canAccess = await canAccessSubject(req.portalUser, assignment.subject_id);
      if (!canAccess) return res.status(403).json({ error: 'Not authorized' });
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', req.params.id)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[assignments]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/submissions/:id/grade — teacher grade a submission
router.put('/submissions/:id/grade', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  if (role !== 'teacher' && role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  try {
    const { data: sub } = await supabase
      .from('assignment_submissions')
      .select('assignment_id')
      .eq('id', req.params.id)
      .single();
    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    const { data: assignment } = await supabase
      .from('assignments')
      .select('subject_id')
      .eq('id', sub.assignment_id)
      .single();

    if (role === 'teacher') {
      const assigned = await isAssignedTeacher(portal_id, assignment.subject_id);
      if (!assigned) return res.status(403).json({ error: 'Not assigned to this subject' });
    }

    const { marks_obtained, feedback } = req.body;
    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({
        marks_obtained,
        feedback,
        graded_at: new Date().toISOString(),
        status: 'graded'
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[assignments]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

export default router;
