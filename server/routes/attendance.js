import { Router } from 'express';
import supabase from '../supabase.js';
import { authMiddleware, isDepartmentHod } from '../auth.js';

const router = Router();
router.use(authMiddleware);

// Helper: check if a user can manage an offering's attendance
async function canManageAttendance(portalUser, offeringId) {
  const { role, portal_id } = portalUser;
  if (role === 'admin') return true;
  
  const { data: offering, error } = await supabase
    .from('subject_offerings')
    .select('teacher_portal_id, section_id, sections(department_id)')
    .eq('id', offeringId)
    .single();
    
  if (error || !offering) return false;
  
  if (role === 'teacher' && offering.teacher_portal_id === portal_id) return true;
  if (role === 'hod' && await isDepartmentHod(portal_id, offering.sections.department_id)) return true;
  
  return false;
}

// POST /api/attendance/record — bulk record attendance for an offering + date
router.post('/record', async (req, res) => {
  const { offering_id, date, records } = req.body;
  
  if (!offering_id || !date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'offering_id, date, and records array are required' });
  }

  try {
    const hasAccess = await canManageAttendance(req.portalUser, offering_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to manage attendance for this offering' });
    }

    // Upsert the records (conflict on offering_id, student_portal_id, date)
    const upsertData = records.map(r => ({
      offering_id,
      date,
      student_portal_id: r.student_portal_id,
      status: r.status,
      recorded_by: req.portalUser.portal_id,
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('offering_attendance')
      .upsert(upsertData, { onConflict: 'offering_id,student_portal_id,date' })
      .select();

    if (error) throw error;
    res.status(200).json({ message: 'Attendance recorded successfully', count: data?.length || 0 });
  } catch (err) {
    console.error('[attendance]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/attendance/offering/:offeringId — get attendance records for an offering
router.get('/offering/:offeringId', async (req, res) => {
  const { offeringId } = req.params;
  const { date } = req.query;

  try {
    const hasAccess = await canManageAttendance(req.portalUser, offeringId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to view attendance for this offering' });
    }

    let query = supabase.from('offering_attendance').select('*').eq('offering_id', offeringId);
    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[attendance]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/attendance/my — get logged-in student's attendance
router.get('/my', async (req, res) => {
  if (req.portalUser.role !== 'student') {
    return res.status(403).json({ error: 'Only students can view their own attendance' });
  }

  try {
    // Get all attendance records for this student, joined with subject offering and subject
    const { data, error } = await supabase
      .from('offering_attendance')
      .select('*, subject_offerings(id, subjects(id, code, name))')
      .eq('student_portal_id', req.portalUser.portal_id)
      .order('date', { ascending: false });

    if (error) throw error;

    // Aggregate by subject
    const summary = {};
    const records = data || [];
    
    records.forEach(r => {
      const subject = r.subject_offerings?.subjects;
      if (!subject) return;
      
      if (!summary[subject.id]) {
        summary[subject.id] = {
          subject_code: subject.code,
          subject_name: subject.name,
          total_classes: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0
        };
      }
      
      summary[subject.id].total_classes++;
      summary[subject.id][r.status]++;
    });

    // Calculate percentages
    Object.values(summary).forEach(s => {
      s.percentage = s.total_classes > 0 ? Math.round(((s.present + s.late + s.excused) / s.total_classes) * 100) : 0;
    });

    res.json({
      records,
      summary: Object.values(summary)
    });
  } catch (err) {
    console.error('[attendance]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/attendance/section/:sectionId/summary — get section attendance summary
router.get('/section/:sectionId/summary', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  const { sectionId } = req.params;

  try {
    // Auth check: Admin, HOD of dept, or Class Advisor/Mentor of section
    let allowed = false;
    
    if (role === 'admin') allowed = true;
    
    const { data: section, error: secError } = await supabase
      .from('sections')
      .select('department_id, class_advisor_portal_id, mentor_portal_id')
      .eq('id', sectionId)
      .single();
      
    if (secError || !section) return res.status(404).json({ error: 'Section not found' });
    
    if (role === 'hod' && await isDepartmentHod(portal_id, section.department_id)) allowed = true;
    if (role === 'teacher' && (section.class_advisor_portal_id === portal_id || section.mentor_portal_id === portal_id)) allowed = true;
    
    if (!allowed) {
      return res.status(403).json({ error: 'Not authorized to view section attendance' });
    }

    // Get all students in section
    const { data: students, error: studError } = await supabase
      .from('portal_users')
      .select('portal_id, name')
      .eq('section_id', sectionId)
      .eq('role', 'student');
      
    if (studError) throw studError;
    const studentIds = (students || []).map(s => s.portal_id);

    if (studentIds.length === 0) {
      return res.json([]);
    }

    // Get all attendance for these students
    const { data: attendance, error: attError } = await supabase
      .from('offering_attendance')
      .select('student_portal_id, status')
      .in('student_portal_id', studentIds);
      
    if (attError) throw attError;

    // Calculate summary per student
    const studentStats = {};
    (students || []).forEach(s => {
      studentStats[s.portal_id] = {
        portal_id: s.portal_id,
        name: s.name,
        total_classes: 0,
        present: 0
      };
    });

    (attendance || []).forEach(a => {
      if (studentStats[a.student_portal_id]) {
        studentStats[a.student_portal_id].total_classes++;
        if (a.status !== 'absent') {
          studentStats[a.student_portal_id].present++;
        }
      }
    });

    // Format output
    const result = Object.values(studentStats).map(s => ({
      ...s,
      percentage: s.total_classes > 0 ? Math.round((s.present / s.total_classes) * 100) : null
    }));

    res.json(result);
  } catch (err) {
    console.error('[attendance]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/attendance/department/:deptId/summary — department-wide attendance summary
router.get('/department/:deptId/summary', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  const { deptId } = req.params;

  try {
    // Auth: admin or HOD of this department
    if (role === 'admin') { /* allowed */ }
    else if (role === 'hod') {
      const isHod = await isDepartmentHod(portal_id, deptId);
      if (!isHod) return res.status(403).json({ error: 'Access denied. Not your department.' });
    } else {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Get all sections in this department
    const { data: sections, error: secErr } = await supabase
      .from('sections')
      .select('id, section_name, batch_year')
      .eq('department_id', deptId)
      .order('section_name');
    if (secErr) throw secErr;

    if (!sections || sections.length === 0) {
      return res.json({ sections: [], totals: { total_classes: 0, total_present: 0, percentage: null } });
    }

    const sectionIds = sections.map(s => s.id);

    // Get all students in these sections
    const { data: students, error: studErr } = await supabase
      .from('portal_users')
      .select('portal_id, name, section_id')
      .in('section_id', sectionIds)
      .eq('role', 'student');
    if (studErr) throw studErr;

    const studentIds = (students || []).map(s => s.portal_id);

    // Get all attendance records for these students
    let attendance = [];
    if (studentIds.length > 0) {
      const { data: att, error: attErr } = await supabase
        .from('offering_attendance')
        .select('student_portal_id, status')
        .in('student_portal_id', studentIds);
      if (attErr) throw attErr;
      attendance = att || [];
    }

    // Build per-section summary
    const sectionSummary = sections.map(sec => {
      const secStudents = (students || []).filter(s => s.section_id === sec.id);
      const secStudentIds = secStudents.map(s => s.portal_id);
      const secAtt = attendance.filter(a => secStudentIds.includes(a.student_portal_id));

      const totalClasses = secAtt.length;
      const totalPresent = secAtt.filter(a => a.status !== 'absent').length;

      return {
        section_id: sec.id,
        section_name: sec.section_name,
        batch_year: sec.batch_year,
        student_count: secStudents.length,
        total_classes: totalClasses,
        total_present: totalPresent,
        percentage: totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : null,
      };
    });

    // Grand totals
    const grandClasses = sectionSummary.reduce((a, s) => a + s.total_classes, 0);
    const grandPresent = sectionSummary.reduce((a, s) => a + s.total_present, 0);

    res.json({
      sections: sectionSummary,
      totals: {
        total_classes: grandClasses,
        total_present: grandPresent,
        percentage: grandClasses > 0 ? Math.round((grandPresent / grandClasses) * 100) : null,
      }
    });
  } catch (err) {
    console.error('[attendance]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

export default router;
