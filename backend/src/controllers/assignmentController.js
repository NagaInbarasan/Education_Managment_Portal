/**
 * Phazon Backend — Assignments Controller
 * Handles assignment creation, student submissions, and teacher grading.
 */

'use strict';

const supabase = require('../config/supabase');
const { assertDepartmentScope } = require('../middleware/scopeGuard');
const { notifyClass, createNotification } = require('../services/notificationService');

/**
 * POST /api/assignments
 */
async function createAssignment(req, res, next) {
  try {
    const { title, description, class_id, subject_id, due_date, max_marks } = req.body;
    const teacher_id = req.userId;

    if (!title || !class_id || !subject_id) {
      return res.status(400).json({ success: false, message: 'title, class_id, and subject_id are required.' });
    }

    if (req.userRole === 'teacher') {
      const { data: assignmentCheck } = await supabase
        .from('teacher_assignments')
        .select('id')
        .eq('teacher_id', teacher_id)
        .eq('class_id', class_id)
        .eq('subject_id', subject_id)
        .maybeSingle();
        
      if (!assignmentCheck) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to this class and subject.' });
      }
    } else if (req.userRole === 'hod') {
      const { data: cls } = await supabase.from('classes').select('department_id').eq('id', class_id).single();
      if (cls) assertDepartmentScope(req, cls.department_id);
    }

    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert([{
        title: title.trim(),
        description: description || null,
        class_id,
        subject_id,
        teacher_id,
        due_date: due_date || null,
        max_marks: max_marks ? parseInt(max_marks, 10) : 100,
        is_active: true,
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Trigger Notification to enrolled students
    notifyClass({
      class_id,
      sender_id: teacher_id,
      type: 'ASSIGNMENT_CREATED',
      title: `New Assignment: ${title.trim()}`,
      message: `A new assignment "${title.trim()}" has been posted. Max marks: ${assignment.max_marks}.`,
      entity_type: 'assignment',
      entity_id: assignment.id
    }).catch(err => console.error('[NotificationTrigger] Assignment creation error:', err.message));

    return res.status(201).json({ success: true, message: 'Assignment created.', data: assignment });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/assignments
 */
async function getAllAssignments(req, res, next) {
  try {
    const { class_id, subject_id } = req.query;

    let query = supabase
      .from('assignments')
      .select('id, title, description, class_id, subject_id, teacher_id, due_date, max_marks, is_active, created_at, subject:subjects(name, code), teacher:users!assignments_teacher_id_fkey(name)');

    if (class_id) query = query.eq('class_id', class_id);
    if (subject_id) query = query.eq('subject_id', subject_id);

    if (req.userRole === 'hod') {
      const { data: classes } = await supabase.from('classes').select('id').eq('department_id', req.departmentId);
      const classIds = classes ? classes.map(c => c.id) : [];
      if (classIds.length === 0) return res.status(200).json({ success: true, data: [] });
      query = query.in('class_id', classIds);
    } else if (req.userRole === 'teacher' || req.userRole === 'student') {
      if (!req.classIds || req.classIds.length === 0) return res.status(200).json({ success: true, data: [] });
      query = query.in('class_id', req.classIds);
    }
    
    if (req.userRole === 'student') {
      query = query.eq('is_active', true);
    }

    const { data: assignments, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    
    // Auto-derive status
    const now = new Date();
    const enriched = (assignments || []).map(a => {
      let status = 'Published';
      if (!a.is_active) status = 'Draft';
      else if (a.due_date && new Date(a.due_date) < now) status = 'Closed';
      return { ...a, status_derived: status };
    });

    return res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/assignments/:id/submit (Student)
 */
async function submitAssignment(req, res, next) {
  try {
    const { id } = req.params; // assignment_id
    const student_id = req.userId;
    const { submission_text, file_url } = req.body;

    if (!submission_text && !file_url) {
      return res.status(400).json({ success: false, message: 'Either submission_text or file_url must be provided.' });
    }

    // Validate enrollment
    const { data: assignmentInfo } = await supabase.from('assignments').select('class_id, due_date').eq('id', id).single();
    if (!assignmentInfo) return res.status(404).json({ success: false, message: 'Assignment not found.' });

    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select('id')
      .eq('student_id', student_id)
      .eq('class_id', assignmentInfo.class_id)
      .maybeSingle();

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Forbidden: You are not enrolled in the class for this assignment.' });
    }

    const { data: submission, error } = await supabase
      .from('assignment_submissions')
      .upsert([{
        assignment_id: id,
        student_id,
        submission_text: submission_text || null,
        file_url: file_url || null,
        submitted_at: new Date().toISOString(),
      }], { onConflict: 'assignment_id,student_id' })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Assignment submitted successfully.', data: submission });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/assignments/submissions/:submissionId/grade (Teacher/HOD/Admin)
 */
async function gradeSubmission(req, res, next) {
  try {
    const { submissionId } = req.params;
    const { marks, grade, feedback } = req.body;
    const teacher_id = req.userId;

    if (marks === undefined) {
      return res.status(400).json({ success: false, message: 'marks field is required.' });
    }

    const { data: submission, error } = await supabase
      .from('assignment_submissions')
      .update({
        marks: parseInt(marks, 10),
        grade: grade || null,
        feedback: feedback || null,
        graded_at: new Date().toISOString(),
        graded_by: teacher_id,
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Trigger Notification to student
    if (submission) {
      createNotification({
        recipient_id: submission.student_id,
        sender_id: teacher_id,
        type: 'ASSIGNMENT_GRADED',
        title: 'Assignment Graded',
        message: `Your assignment submission has been graded. Marks: ${submission.marks}.`,
        entity_type: 'assignment_submission',
        entity_id: submission.id
      }).catch(err => console.error('[NotificationTrigger] Assignment grade error:', err.message));
    }

    return res.status(200).json({ success: true, message: 'Submission graded successfully.', data: submission });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/assignments/my-submissions (Student)
 */
async function getMySubmissions(req, res, next) {
  try {
    const student_id = req.query.student_id && ['admin', 'hod', 'teacher'].includes(req.userRole)
      ? req.query.student_id
      : req.userId;

    const { data: submissions, error } = await supabase
      .from('assignment_submissions')
      .select('id, assignment_id, submission_text, file_url, submitted_at, marks, grade, feedback, graded_at, assignment:assignments(title, max_marks, due_date, subject:subjects(name, code))')
      .eq('student_id', student_id);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    
    // Auto-derive status
    const enriched = (submissions || []).map(s => {
      let submissionStatus = 'On Time';
      if (s.assignment && s.assignment.due_date && new Date(s.submitted_at) > new Date(s.assignment.due_date)) {
        submissionStatus = 'Late';
      }
      return { ...s, submission_status_derived: submissionStatus };
    });

    return res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createAssignment,
  getAllAssignments,
  submitAssignment,
  gradeSubmission,
  getMySubmissions,
};
