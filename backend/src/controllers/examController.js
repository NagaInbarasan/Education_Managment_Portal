/**
 * Phazon Backend — Exams Controller
 * Handles deterministic examination lifecycle, secure evaluations, and attempts.
 */

'use strict';

const supabase = require('../config/supabase');
const { assertDepartmentScope } = require('../middleware/scopeGuard');
const { notifyClass } = require('../services/notificationService');

// Utility to check if a user is a teacher for the given class/subject
async function isAssignedTeacher(teacher_id, class_id, subject_id) {
  const { data } = await supabase
    .from('teacher_assignments')
    .select('id')
    .eq('teacher_id', teacher_id)
    .eq('class_id', class_id)
    .eq('subject_id', subject_id)
    .maybeSingle();
  return !!data;
}

// ------------------------------------------------------------------
// EXAM MANAGEMENT (Teacher/Admin/HOD)
// ------------------------------------------------------------------

/** GET /api/exams */
async function getExams(req, res, next) {
  try {
    const { class_id, subject_id } = req.query;

    let query = supabase
      .from('exams')
      .select('id, title, description, class_id, subject_id, teacher_id, exam_type, start_at, end_at, duration_minutes, max_marks, pass_marks, status, created_at, subject:subjects(name, code), class:classes(name)');

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
      query = query.in('status', ['PUBLISHED', 'SCHEDULED', 'LIVE', 'COMPLETED']);
    }

    const { data: exams, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, data: exams || [] });
  } catch (err) {
    next(err);
  }
}

/** GET /api/exams/:id */
async function getExamDetails(req, res, next) {
  try {
    const { id } = req.params;

    // Get Exam
    const { data: exam, error } = await supabase
      .from('exams')
      .select('*, subject:subjects(name, code), class:classes(name)')
      .eq('id', id)
      .single();

    if (error || !exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    // Validate enrollment for student
    if (req.userRole === 'student') {
      const { data: enrollment } = await supabase.from('student_enrollments').select('id').eq('student_id', req.userId).eq('class_id', exam.class_id).maybeSingle();
      if (!enrollment) return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Get Questions
    const { data: questions, error: qErr } = await supabase
      .from('exam_questions')
      .select('*')
      .eq('exam_id', id)
      .order('order_index', { ascending: true });

    if (qErr) throw qErr;

    // Strip answers for students
    if (req.userRole === 'student') {
      questions.forEach(q => {
        delete q.correct_answer;
        delete q.explanation;
      });
    }

    exam.questions = questions || [];
    return res.status(200).json({ success: true, data: exam });
  } catch (err) {
    next(err);
  }
}

/** POST /api/exams */
async function createExam(req, res, next) {
  try {
    const { title, description, class_id, subject_id, exam_type, start_at, end_at, duration_minutes, max_marks, pass_marks } = req.body;

    if (!title || !class_id || !subject_id) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (req.userRole === 'teacher') {
      const assigned = await isAssignedTeacher(req.userId, class_id, subject_id);
      if (!assigned) return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to this class and subject.' });
    } else if (req.userRole === 'hod') {
      const { data: cls } = await supabase.from('classes').select('department_id').eq('id', class_id).single();
      if (cls) assertDepartmentScope(req, cls.department_id);
    }

    const { data: exam, error } = await supabase
      .from('exams')
      .insert([{
        title, description, class_id, subject_id, teacher_id: req.userId,
        exam_type: exam_type || 'INTERNAL',
        start_at: start_at || null, end_at: end_at || null,
        duration_minutes: duration_minutes ? parseInt(duration_minutes, 10) : 60,
        max_marks: max_marks ? parseInt(max_marks, 10) : 100,
        pass_marks: pass_marks ? parseInt(pass_marks, 10) : 40,
        status: 'DRAFT'
      }])
      .select().single();

    if (error) throw error;

    // Trigger Notification
    if (['PUBLISHED', 'SCHEDULED', 'LIVE'].includes(exam.status)) {
      notifyClass({
        class_id,
        sender_id: req.userId,
        type: 'EXAM_SCHEDULED',
        title: `Exam Scheduled: ${title}`,
        message: `An exam "${title}" has been scheduled. Duration: ${exam.duration_minutes} minutes.`,
        entity_type: 'exam',
        entity_id: exam.id
      }).catch(err => console.error('[NotificationTrigger] Exam scheduled error:', err.message));
    }

    return res.status(201).json({ success: true, data: exam });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/exams/:id */
async function updateExam(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body; // allow updating status, start_at, end_at, etc.
    
    // Validate ownership
    const { data: existing } = await supabase.from('exams').select('class_id, subject_id').eq('id', id).single();
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.userRole === 'teacher') {
      const assigned = await isAssignedTeacher(req.userId, existing.class_id, existing.subject_id);
      if (!assigned) return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { data: exam, error } = await supabase
      .from('exams')
      .update(updates)
      .eq('id', id)
      .select().single();

    if (error) throw error;

    // Trigger Notification if status updated to active
    if (updates.status && ['PUBLISHED', 'SCHEDULED', 'LIVE'].includes(updates.status)) {
      notifyClass({
        class_id: exam.class_id,
        sender_id: req.userId,
        type: 'EXAM_SCHEDULED',
        title: `Exam Update: ${exam.title}`,
        message: `The schedule/status for "${exam.title}" has been updated to ${updates.status}.`,
        entity_type: 'exam',
        entity_id: exam.id
      }).catch(err => console.error('[NotificationTrigger] Exam update error:', err.message));
    }

    return res.status(200).json({ success: true, data: exam });
  } catch (err) {
    next(err);
  }
}

/** POST /api/exams/:id/questions */
async function addQuestion(req, res, next) {
  try {
    const { id } = req.params;
    const { question_text, question_type, marks, order_index, options, correct_answer, explanation } = req.body;

    const { data: exam } = await supabase.from('exams').select('class_id, subject_id').eq('id', id).single();
    if (!exam) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.userRole === 'teacher') {
      const assigned = await isAssignedTeacher(req.userId, exam.class_id, exam.subject_id);
      if (!assigned) return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { data: question, error } = await supabase
      .from('exam_questions')
      .insert([{
        exam_id: id, question_text, question_type, marks: marks || 1, order_index: order_index || 0,
        options: options || null, correct_answer, explanation
      }])
      .select().single();

    if (error) throw error;
    return res.status(201).json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// STUDENT ATTEMPTS & EVALUATION
// ------------------------------------------------------------------

/** POST /api/exams/:id/start */
async function startExam(req, res, next) {
  try {
    const { id } = req.params;
    const student_id = req.userId;

    // 1. Get Exam
    const { data: exam } = await supabase.from('exams').select('*').eq('id', id).single();
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    // 2. Validate Enrollment
    const { data: enrollment } = await supabase.from('student_enrollments').select('id').eq('student_id', student_id).eq('class_id', exam.class_id).maybeSingle();
    if (!enrollment) return res.status(403).json({ success: false, message: 'Forbidden' });

    // 3. Validate Status and Window
    if (!['LIVE', 'PUBLISHED', 'SCHEDULED'].includes(exam.status)) {
      return res.status(400).json({ success: false, message: 'Exam is not currently active' });
    }

    const now = new Date();
    if (exam.start_at && now < new Date(exam.start_at)) {
      return res.status(400).json({ success: false, message: 'Exam has not started yet' });
    }
    if (exam.end_at && now > new Date(exam.end_at)) {
      return res.status(400).json({ success: false, message: 'Exam has already ended' });
    }

    // 4. Create or return attempt (Upsert avoids race conditions)
    const { data: attempt, error } = await supabase
      .from('exam_attempts')
      .upsert([{
        exam_id: id,
        student_id: student_id,
        status: 'IN_PROGRESS'
      }], { onConflict: 'exam_id,student_id', ignoreDuplicates: true })
      .select().single();

    if (error) throw error;
    return res.status(200).json({ success: true, data: attempt });
  } catch (err) {
    next(err);
  }
}

/** POST /api/exams/:id/submit */
async function submitExam(req, res, next) {
  try {
    const { id } = req.params;
    const student_id = req.userId;
    const { answers } = req.body; // Array of { question_id, answer }

    // 1. Get Attempt
    const { data: attempt } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', id)
      .eq('student_id', student_id)
      .single();

    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found. Start exam first.' });
    if (['SUBMITTED', 'AUTO_SUBMITTED', 'GRADED'].includes(attempt.status)) {
      return res.status(400).json({ success: false, message: 'Exam already submitted' });
    }

    // 2. Validate Deadline (Server Authoritative)
    const { data: exam } = await supabase.from('exams').select('end_at, duration_minutes').eq('id', id).single();
    const now = new Date();
    let isAutoSubmitted = false;
    
    if (exam.end_at && now > new Date(exam.end_at)) {
      // Allow a 2 minute buffer for network delay, otherwise reject entirely
      const bufferEnd = new Date(new Date(exam.end_at).getTime() + 2 * 60000);
      if (now > bufferEnd) {
        return res.status(400).json({ success: false, message: 'Submission rejected: Past hard deadline.' });
      }
      isAutoSubmitted = true;
    }

    // Duration Check
    const startedAt = new Date(attempt.started_at);
    const expectedEnd = new Date(startedAt.getTime() + (exam.duration_minutes * 60000));
    if (now > new Date(expectedEnd.getTime() + 2 * 60000)) {
      isAutoSubmitted = true;
    }

    // 3. Process Answers & Evaluate (Transactional via mapped payload)
    const { data: questions } = await supabase.from('exam_questions').select('*').eq('exam_id', id);
    let totalScore = 0;
    let totalMarks = 0;

    const answerPayloads = [];
    for (const q of questions) {
      totalMarks += q.marks;
      const studentAnswer = answers.find(a => a.question_id === q.id);
      if (!studentAnswer) continue;

      let marks_awarded = 0;
      let is_correct = false;

      // Objective Evaluation
      if (q.question_type === 'MCQ' || q.question_type === 'TRUE_FALSE') {
        if (studentAnswer.answer === q.correct_answer) {
          is_correct = true;
          marks_awarded = q.marks;
        }
      }

      totalScore += marks_awarded;

      answerPayloads.push({
        attempt_id: attempt.id,
        question_id: q.id,
        answer: studentAnswer.answer,
        is_correct,
        marks_awarded
      });
    }

    // Upsert Answers
    if (answerPayloads.length > 0) {
      await supabase.from('exam_answers').upsert(answerPayloads, { onConflict: 'attempt_id,question_id' });
    }

    // 4. Update Attempt
    const percentage = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;
    const finalStatus = isAutoSubmitted ? 'AUTO_SUBMITTED' : 'SUBMITTED';

    const { data: finalAttempt, error: attErr } = await supabase
      .from('exam_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        status: finalStatus,
        score: totalScore,
        total_marks: totalMarks,
        percentage: parseFloat(percentage.toFixed(2))
      })
      .eq('id', attempt.id)
      .select().single();

    if (attErr) throw attErr;

    return res.status(200).json({ success: true, message: 'Exam submitted successfully', data: finalAttempt });
  } catch (err) {
    next(err);
  }
}

/** GET /api/exams/:id/results (Teacher/HOD/Admin) */
async function getExamResults(req, res, next) {
  try {
    const { id } = req.params;

    const { data: exam } = await supabase.from('exams').select('class_id, subject_id').eq('id', id).single();
    if (!exam) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.userRole === 'teacher') {
      const assigned = await isAssignedTeacher(req.userId, exam.class_id, exam.subject_id);
      if (!assigned) return res.status(403).json({ success: false, message: 'Forbidden' });
    } else if (req.userRole === 'hod') {
      const { data: cls } = await supabase.from('classes').select('department_id').eq('id', exam.class_id).single();
      if (cls) assertDepartmentScope(req, cls.department_id);
    }

    const { data: attempts, error } = await supabase
      .from('exam_attempts')
      .select('*, student:users!exam_attempts_student_id_fkey(name, email)')
      .eq('exam_id', id);

    if (error) throw error;
    return res.status(200).json({ success: true, data: attempts || [] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getExams,
  getExamDetails,
  createExam,
  updateExam,
  addQuestion,
  startExam,
  submitExam,
  getExamResults
};
