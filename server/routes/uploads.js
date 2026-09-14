import { Router } from 'express';
import multer from 'multer';
import supabase from '../supabase.js';
import { authMiddleware, isAssignedTeacher } from '../auth.js';

const router = Router();
router.use(authMiddleware);

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// POST /api/offerings/:id/documents — upload document (teacher/admin)
router.post('/offerings/:id/documents', upload.single('file'), async (req, res) => {
  const { role, portal_id, name } = req.portalUser;
  if (role !== 'teacher' && role !== 'admin') {
    return res.status(403).json({ error: 'Only teachers can upload materials' });
  }

  try {
    const { data: offering, error: offErr } = await supabase.from('subject_offerings').select('id, subject_id, teacher_portal_id').eq('id', req.params.id).single();
    if (offErr || !offering) return res.status(404).json({ error: 'Offering not found' });

    if (role === 'teacher' && offering.teacher_portal_id !== portal_id) {
      return res.status(403).json({ error: 'Not assigned to this offering' });
    }

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { title, description, unit_or_module } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const storagePath = `${req.params.id}/${timestamp}_${req.file.originalname}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Save metadata to DB
    const { data, error } = await supabase
      .from('subject_documents')
      .insert({
        offering_id: req.params.id,
        subject_id: offering.subject_id,
        title,
        description: description || null,
        file_name: req.file.originalname,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        storage_path: storagePath,
        uploaded_by: portal_id,
        unit_or_module: unit_or_module || null
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[uploads]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/documents/:id/download — get signed download URL
router.get('/documents/:id/download', async (req, res) => {
  try {
    const { data: doc } = await supabase
      .from('subject_documents')
      .select('storage_path, file_name, subject_id')
      .eq('id', req.params.id)
      .single();

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const { data: urlData, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 3600); // 1 hour

    if (error) throw error;
    res.json({ url: urlData.signedUrl, file_name: doc.file_name });
  } catch (err) {
    console.error('[uploads]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/assignments/:id/attachment — upload assignment attachment (teacher)
router.post('/assignments/:id/attachment', upload.single('file'), async (req, res) => {
  const { role, portal_id } = req.portalUser;
  if (role !== 'teacher' && role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const { data: assignment } = await supabase
      .from('assignments')
      .select('offering_id, subject_offerings(teacher_portal_id)')
      .eq('id', req.params.id)
      .single();
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    if (role === 'teacher') {
      if (assignment.subject_offerings.teacher_portal_id !== portal_id) {
        return res.status(403).json({ error: 'Not assigned to this offering' });
      }
    }

    const storagePath = `assignments/${req.params.id}/${Date.now()}_${req.file.originalname}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('assignments')
      .update({ attachment_path: storagePath, attachment_name: req.file.originalname })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[uploads]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/assignments/:id/submit-file — student submit assignment file
router.post('/assignments/:id/submit-file', upload.single('file'), async (req, res) => {
  const { role, portal_id, name } = req.portalUser;
  if (role !== 'student') return res.status(403).json({ error: 'Only students can submit' });

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const { data: assignment } = await supabase
      .from('assignments')
      .select('subject_id, status')
      .eq('id', req.params.id)
      .single();
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    if (assignment.status !== 'published') return res.status(400).json({ error: 'Assignment not open' });

    const storagePath = `submissions/${req.params.id}/${portal_id}/${Date.now()}_${req.file.originalname}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });
    if (uploadError) throw uploadError;

    // Check existing submission
    const { data: existing } = await supabase
      .from('assignment_submissions')
      .select('id, status')
      .eq('assignment_id', req.params.id)
      .eq('student_portal_id', portal_id)
      .single();

    if (existing) {
      if (existing.status === 'graded' || existing.status === 'returned') {
        return res.status(400).json({ error: 'Cannot resubmit after grading' });
      }
      const { data, error } = await supabase
        .from('assignment_submissions')
        .update({
          submission_path: storagePath,
          submission_name: req.file.originalname,
          submitted_at: new Date().toISOString()
        })
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
        submission_path: storagePath,
        submission_name: req.file.originalname,
        status: 'submitted'
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[uploads]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/portal-users — list all portal users (admin only, or filtered)
router.get('/portal-users', async (req, res) => {
  const { role: filterRole } = req.query;
  try {
    let query = supabase.from('portal_users').select('portal_id, name, role, department, email, section_id, batch_year, register_number');
    if (filterRole) query = query.eq('role', filterRole);
    const { data, error } = await query.order('portal_id');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[uploads]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/portal-users — create portal user (admin only)
router.post('/portal-users', async (req, res) => {
  if (req.portalUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { portal_id, name, email, role, department, section_id, batch_year, register_number } = req.body;
  try {
    const { data, error } = await supabase
      .from('portal_users')
      .insert({ portal_id, name, email, role, department, section_id: section_id || null, batch_year: batch_year || null, register_number: register_number || null })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[uploads]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/portal-users/:portalId — update portal user (admin only)
router.put('/portal-users/:portalId', async (req, res) => {
  if (req.portalUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { portalId } = req.params;
  const { name, email, department, section_id, batch_year, register_number } = req.body;
  try {
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (department !== undefined) updates.department = department;
    if (section_id !== undefined) updates.section_id = section_id || null;
    if (batch_year !== undefined) updates.batch_year = batch_year || null;
    if (register_number !== undefined) updates.register_number = register_number || null;

    const { data, error } = await supabase
      .from('portal_users')
      .update(updates)
      .eq('portal_id', portalId)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'User not found' });
    res.json(data);
  } catch (err) {
    console.error('[uploads]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// DELETE /api/portal-users/:portalId — delete portal user (admin only)
router.delete('/portal-users/:portalId', async (req, res) => {
  if (req.portalUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { portalId } = req.params;
  try {
    // Cannot delete yourself
    if (portalId === req.portalUser.portal_id) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }

    // Check for dependent offerings (teacher)
    const { count: offeringCount } = await supabase
      .from('subject_offerings')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_portal_id', portalId)
      .eq('status', 'active');
    if (offeringCount > 0) {
      return res.status(409).json({ error: `Cannot delete user with ${offeringCount} active subject offerings. Reassign them first.` });
    }

    // Check if HOD of any department
    const { data: hodDepts } = await supabase
      .from('departments')
      .select('department_code')
      .eq('hod_portal_id', portalId);
    if (hodDepts && hodDepts.length > 0) {
      return res.status(409).json({ error: `Cannot delete user who is HOD of ${hodDepts.map(d => d.department_code).join(', ')}. Reassign HOD first.` });
    }

    const { error } = await supabase
      .from('portal_users')
      .delete()
      .eq('portal_id', portalId);
    if (error) throw error;
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('[uploads]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

export default router;
