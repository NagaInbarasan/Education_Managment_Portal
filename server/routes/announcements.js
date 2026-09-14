import express from 'express';
import supabase from '../supabase.js';
import { createNotificationsBulk } from './notifications.js';
import { isDepartmentHod, authMiddleware } from '../auth.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * Get users within a specific scope for notifications
 */
async function getScopeRecipients(scope, targetId) {
  let recipients = [];
  try {
    if (scope === 'institution') {
      const { data } = await supabase.from('portal_users').select('portal_id');
      if (data) recipients = data.map(u => u.portal_id);
    } else if (scope === 'department' && targetId) {
      // Find all users in sections that belong to this department
      // And the HOD
      const { data: hodData } = await supabase.from('departments').select('hod_portal_id').eq('id', targetId).single();
      const hodId = hodData?.hod_portal_id;

      const { data: sections } = await supabase.from('sections').select('id, mentor_portal_id, class_advisor_portal_id').eq('department_id', targetId);
      
      const sectionIds = sections ? sections.map(s => s.id) : [];
      let deptUserIds = [];
      
      if (sectionIds.length > 0) {
        const { data: users } = await supabase.from('portal_users').select('portal_id').in('section_id', sectionIds);
        if (users) deptUserIds = users.map(u => u.portal_id);
      }

      if (sections) {
        sections.forEach(s => {
          if (s.mentor_portal_id) deptUserIds.push(s.mentor_portal_id);
          if (s.class_advisor_portal_id) deptUserIds.push(s.class_advisor_portal_id);
        });
      }
      
      if (hodId) deptUserIds.push(hodId);
      recipients = [...new Set(deptUserIds)];

    } else if (scope === 'section' && targetId) {
      const { data: users } = await supabase.from('portal_users').select('portal_id').eq('section_id', targetId);
      if (users) recipients = users.map(u => u.portal_id);
    }
  } catch (err) {
    console.error('Error fetching scope recipients:', err);
  }
  return recipients;
}

// GET /api/announcements/my
router.get('/my', async (req, res) => {
  const { role, portal_id, section_id, department_id } = req.portalUser;
  
  try {
    let scopes = ['institution'];
    let targetIds = [];

    // Everyone sees institution announcements
    
    if (role === 'student' && section_id) {
      scopes.push('section');
      targetIds.push(section_id);
      // Student department
      const { data: sec } = await supabase.from('sections').select('department_id').eq('id', section_id).single();
      if (sec && sec.department_id) {
        scopes.push('department');
        targetIds.push(sec.department_id);
      }
    } else if (role === 'teacher') {
      // Teacher sees announcements for sections they advise/mentor
      const { data: advised } = await supabase.from('sections').select('id, department_id').or(`class_advisor_portal_id.eq.${portal_id},mentor_portal_id.eq.${portal_id}`);
      if (advised && advised.length > 0) {
        scopes.push('section');
        scopes.push('department');
        advised.forEach(s => {
          targetIds.push(s.id);
          targetIds.push(s.department_id);
        });
      }
    } else if (role === 'hod' && department_id) {
      scopes.push('department');
      targetIds.push(department_id);
    } else if (role === 'admin') {
      scopes = ['institution', 'department', 'section']; // Admin sees all
    }

    let query = supabase.from('announcements').select('*').order('created_at', { ascending: false });
    
    if (role !== 'admin') {
      const condition = targetIds.length > 0 
        ? `scope.eq.institution,and(scope.in.(${scopes.filter(s=>s!=='institution').join(',')}),target_id.in.(${targetIds.join(',')}))`
        : `scope.eq.institution`;
      query = query.or(condition);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[announcements]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/announcements
router.post('/', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  const { title, message, scope, target_id } = req.body;

  try {
    // 1. Authorization
    if (scope === 'institution' && role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create institution announcements' });
    }
    
    if (scope === 'department') {
      if (role !== 'hod' && role !== 'admin') return res.status(403).json({ error: 'Only HOD/Admin can create department announcements' });
      if (role === 'hod') {
        const isHod = await isDepartmentHod(portal_id, target_id);
        if (!isHod) return res.status(403).json({ error: 'Not authorized for this department' });
      }
    }
    
    if (scope === 'section') {
      if (role !== 'teacher' && role !== 'admin') return res.status(403).json({ error: 'Only authorized teachers can create section announcements' });
      if (role === 'teacher') {
        const { data: section } = await supabase.from('sections').select('class_advisor_portal_id, mentor_portal_id').eq('id', target_id).single();
        if (!section || (section.class_advisor_portal_id !== portal_id && section.mentor_portal_id !== portal_id)) {
          return res.status(403).json({ error: 'Only class advisor or mentor can create section announcements' });
        }
      }
    }

    if (scope !== 'institution' && scope !== 'department' && scope !== 'section') {
      return res.status(400).json({ error: 'Invalid scope' });
    }

    // 2. Insert Announcement
    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({ title, message, scope, target_id: target_id || null, sender_portal_id: portal_id })
      .select()
      .single();

    if (error) throw error;

    // 3. Generate Notifications
    const recipients = await getScopeRecipients(scope, target_id);
    // Don't notify the sender themselves
    const finalRecipients = recipients.filter(r => r !== portal_id);
    
    await createNotificationsBulk(
      finalRecipients,
      portal_id,
      'announcement',
      title,
      `New ${scope} announcement: ${title}`,
      'announcement',
      announcement.id
    );

    res.status(201).json(announcement);
  } catch (err) {
    console.error('[announcements]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/announcements/:id
router.put('/:id', async (req, res) => {
  const { portal_id, role } = req.portalUser;
  const { title, message } = req.body;
  try {
    const { data: existing } = await supabase.from('announcements').select('sender_portal_id').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.sender_portal_id !== portal_id && role !== 'admin') {
      return res.status(403).json({ error: 'Only author can edit' });
    }

    const { data, error } = await supabase
      .from('announcements')
      .update({ title, message, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[announcements]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', async (req, res) => {
  const { portal_id, role } = req.portalUser;
  try {
    const { data: existing } = await supabase.from('announcements').select('sender_portal_id').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.sender_portal_id !== portal_id && role !== 'admin') {
      return res.status(403).json({ error: 'Only author can delete' });
    }

    const { error } = await supabase.from('announcements').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[announcements]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

export default router;
