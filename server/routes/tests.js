import { Router } from 'express';
import supabase from '../supabase.js';
import { authMiddleware, canAccessSubject, isAssignedTeacher, getHodDepartmentId } from '../auth.js';
import { createNotificationsBulk } from './notifications.js';

const router = Router();
router.use(authMiddleware);

// GET /api/offerings/:offeringId/tests
router.get('/offerings/:offeringId/tests', async (req, res) => {
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
      .from('tests')
      .select('*')
      .eq('offering_id', req.params.offeringId)
      .order('created_at', { ascending: false });

    if (role === 'student') {
      query = query.in('status', ['published', 'closed']);
    }

    const { data, error } = await query;
    if (error) throw error;

    // For students, attach submission status
    if (role === 'student' && data && data.length > 0) {
      const testIds = data.map(t => t.id);
      const { data: subs } = await supabase
        .from('test_submissions')
        .select('test_id, status, total_marks_obtained, submitted_at')
        .eq('student_portal_id', portal_id)
        .in('test_id', testIds);

      const subMap = {};
      (subs || []).forEach(s => { subMap[s.test_id] = s; });
      data.forEach(t => {
        t.my_submission = subMap[t.id] || null;
        // Hide results if not released
        if (t.my_submission && !t.results_released) {
          t.my_submission.total_marks_obtained = null;
        }
      });
    }

    res.json(data || []);
  } catch (err) {
    console.error('[tests]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/offerings/:offeringId/tests — create test (teacher/admin)
router.post('/offerings/:offeringId/tests', async (req, res) => {
  const { role, portal_id, name } = req.portalUser;
  if (role !== 'teacher' && role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  try {
    const { data: offering, error: offErr } = await supabase.from('subject_offerings').select('id, subject_id, teacher_portal_id').eq('id', req.params.offeringId).single();
    if (offErr || !offering) return res.status(404).json({ error: 'Offering not found' });

    if (role === 'teacher' && offering.teacher_portal_id !== portal_id) {
      return res.status(403).json({ error: 'Not assigned to this offering' });
    }

    const { title, description, duration_minutes, start_time, end_time, max_marks, status } = req.body;
    const { data, error } = await supabase
      .from('tests')
      .insert({
        offering_id: req.params.offeringId,
        subject_id: offering.subject_id,
        title,
        description,
        duration_minutes,
        start_time,
        end_time,
        max_marks: max_marks || 100,
        status: status || 'draft',
        created_by: portal_id,
        created_by_name: name
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
            'test',
            `New Test: ${title}`,
            `A new test has been scheduled for ${subjName}.`,
            'offering',
            req.params.offeringId
          );
        }
      }
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('[tests]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/tests/:id — edit test (teacher/admin)
router.put('/tests/:id', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    const { data: test } = await supabase
      .from('tests')
      .select('offering_id, created_by, results_released, subject_offerings(teacher_portal_id)')
      .eq('id', req.params.id)
      .single();
    if (!test) return res.status(404).json({ error: 'Test not found' });

    if (role === 'teacher') {
      if (test.subject_offerings.teacher_portal_id !== portal_id) {
        return res.status(403).json({ error: 'Not assigned to this offering' });
      }
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, description, duration_minutes, start_time, end_time, max_marks, status, results_released } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (duration_minutes !== undefined) updates.duration_minutes = duration_minutes;
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    if (max_marks !== undefined) updates.max_marks = max_marks;
    if (status !== undefined) updates.status = status;
    if (results_released !== undefined) updates.results_released = results_released;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('tests')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    // Trigger notification if results just released
    if (results_released === true && test.results_released !== true) {
      const { data: offDetails } = await supabase.from('subject_offerings').select('section_id, subjects(name)').eq('id', test.offering_id).single();
      if (offDetails && offDetails.section_id) {
        const { data: students } = await supabase.from('portal_users').select('portal_id').eq('section_id', offDetails.section_id).eq('role', 'student');
        if (students) {
          const recipients = students.map(s => s.portal_id);
          const subjName = offDetails.subjects?.name || 'Subject';
          await createNotificationsBulk(
            recipients,
            portal_id,
            'result',
            `Test Results Released: ${title || data.title}`,
            `Results for the test "${title || data.title}" in ${subjName} are now available.`,
            'offering',
            test.offering_id
          );
        }
      }
    }

    res.json(data);
  } catch (err) {
    console.error('[tests]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// --- QUESTIONS ---

// GET /api/tests/:id/questions
router.get('/tests/:id/questions', async (req, res) => {
  try {
    const { data: test } = await supabase
      .from('tests')
      .select('offering_id, status, subject_offerings(section_id, teacher_portal_id)')
      .eq('id', req.params.id)
      .single();
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const { role, portal_id, section_id } = req.portalUser;
    const offering = test.subject_offerings;

    if (role === 'teacher' && offering.teacher_portal_id !== portal_id) return res.status(403).json({ error: 'Not authorized for this offering' });
    if (role === 'student' && offering.section_id !== section_id) return res.status(403).json({ error: 'Not authorized for this offering' });
    let query = supabase
      .from('test_questions')
      .select('*')
      .eq('test_id', req.params.id)
      .order('question_order');

    const { data, error } = await query;
    if (error) throw error;

    // Students should NOT see correct answers while test is published
    if (role === 'student' && test.status === 'published') {
      (data || []).forEach(q => { q.correct_answer = undefined; });
    }

    res.json(data || []);
  } catch (err) {
    console.error('[tests]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// POST /api/tests/:id/questions — add question (teacher/admin)
router.post('/tests/:id/questions', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  if (role !== 'teacher' && role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  try {
    const { data: test } = await supabase.from('tests').select('subject_id').eq('id', req.params.id).single();
    if (!test) return res.status(404).json({ error: 'Test not found' });

    if (role === 'teacher') {
      const assigned = await isAssignedTeacher(portal_id, test.subject_id);
      if (!assigned) return res.status(403).json({ error: 'Not assigned to this subject' });
    }

    const { question_order, question_text, question_type, options, correct_answer, marks } = req.body;
    const { data, error } = await supabase
      .from('test_questions')
      .insert({
        test_id: req.params.id,
        question_order: question_order || 1,
        question_text,
        question_type,
        options: options || null,
        correct_answer,
        marks: marks || 1
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[tests]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/questions/:id — edit question
router.put('/questions/:id', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  if (role !== 'teacher' && role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  try {
    const { data: question } = await supabase.from('test_questions').select('test_id').eq('id', req.params.id).single();
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const { data: test } = await supabase.from('tests').select('subject_id').eq('id', question.test_id).single();
    if (role === 'teacher') {
      const assigned = await isAssignedTeacher(portal_id, test.subject_id);
      if (!assigned) return res.status(403).json({ error: 'Not assigned' });
    }

    const { question_order, question_text, question_type, options, correct_answer, marks } = req.body;
    const updates = {};
    if (question_order !== undefined) updates.question_order = question_order;
    if (question_text !== undefined) updates.question_text = question_text;
    if (question_type !== undefined) updates.question_type = question_type;
    if (options !== undefined) updates.options = options;
    if (correct_answer !== undefined) updates.correct_answer = correct_answer;
    if (marks !== undefined) updates.marks = marks;

    const { data, error } = await supabase
      .from('test_questions')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[tests]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// DELETE /api/questions/:id
router.delete('/questions/:id', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  if (role !== 'teacher' && role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  try {
    const { data: question } = await supabase.from('test_questions').select('test_id').eq('id', req.params.id).single();
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const { data: test } = await supabase.from('tests').select('subject_id').eq('id', question.test_id).single();
    if (role === 'teacher') {
      const assigned = await isAssignedTeacher(portal_id, test.subject_id);
      if (!assigned) return res.status(403).json({ error: 'Not assigned' });
    }

    const { error } = await supabase.from('test_questions').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[tests]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// --- TEST SUBMISSION ---

// POST /api/tests/:id/submit — student submits test
router.post('/tests/:id/submit', async (req, res) => {
  const { role, portal_id, name } = req.portalUser;
  if (role !== 'student') return res.status(403).json({ error: 'Only students can submit tests' });

  try {
    const { data: test } = await supabase
      .from('tests')
      .select('subject_id, status, max_marks')
      .eq('id', req.params.id)
      .single();
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (test.status !== 'published') return res.status(400).json({ error: 'Test is not open for submissions' });

    const canAccess = await canAccessSubject(req.portalUser, test.subject_id);
    if (!canAccess) return res.status(403).json({ error: 'Not enrolled in this subject' });

    // Check if already submitted
    const { data: existing } = await supabase
      .from('test_submissions')
      .select('id')
      .eq('test_id', req.params.id)
      .eq('student_portal_id', portal_id)
      .single();
    if (existing) return res.status(400).json({ error: 'You have already submitted this test' });

    // Create submission
    const { data: submission, error: subErr } = await supabase
      .from('test_submissions')
      .insert({
        test_id: req.params.id,
        student_portal_id: portal_id,
        student_name: name,
        status: 'submitted'
      })
      .select()
      .single();
    if (subErr) throw subErr;

    // Get questions for auto-grading
    const { data: questions } = await supabase
      .from('test_questions')
      .select('*')
      .eq('test_id', req.params.id);

    // Process answers
    const { answers } = req.body; // Array of { question_id, student_answer }
    let totalMarks = 0;
    let allAutoGradeable = true;
    const answerRows = [];

    for (const ans of (answers || [])) {
      const question = (questions || []).find(q => q.id === ans.question_id);
      if (!question) continue;

      let isCorrect = null;
      let marksAwarded = 0;

      if (question.question_type === 'mcq' || question.question_type === 'true_false') {
        isCorrect = question.correct_answer &&
          ans.student_answer &&
          question.correct_answer.trim().toLowerCase() === ans.student_answer.trim().toLowerCase();
        marksAwarded = isCorrect ? question.marks : 0;
        totalMarks += marksAwarded;
      } else {
        // short_answer — needs manual grading
        allAutoGradeable = false;
      }

      answerRows.push({
        submission_id: submission.id,
        question_id: ans.question_id,
        student_answer: ans.student_answer,
        is_correct: isCorrect,
        marks_awarded: marksAwarded
      });
    }

    if (answerRows.length > 0) {
      const { error: ansErr } = await supabase.from('test_answers').insert(answerRows);
      if (ansErr) throw ansErr;
    }

    // Update submission with auto-graded marks
    const { data: updated, error: upErr } = await supabase
      .from('test_submissions')
      .update({
        total_marks_obtained: totalMarks,
        auto_graded: true,
        manually_graded: allAutoGradeable,
        status: allAutoGradeable ? 'graded' : 'submitted'
      })
      .eq('id', submission.id)
      .select()
      .single();
    if (upErr) throw upErr;

    res.status(201).json(updated);
  } catch (err) {
    console.error('[tests]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/tests/:id/submissions — teacher view all submissions
router.get('/tests/:id/submissions', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  try {
    const { data: test } = await supabase.from('tests').select('subject_id').eq('id', req.params.id).single();
    if (!test) return res.status(404).json({ error: 'Test not found' });

    if (role === 'teacher') {
      const assigned = await isAssignedTeacher(portal_id, test.subject_id);
      if (!assigned) return res.status(403).json({ error: 'Not assigned' });
    } else if (role === 'hod') {
      const canAccess = await canAccessSubject(req.portalUser, test.subject_id);
      if (!canAccess) return res.status(403).json({ error: 'Not authorized' });
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('test_submissions')
      .select('*, test_answers(*)')
      .eq('test_id', req.params.id)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[tests]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/test-answers/:id/grade — teacher grade a short-answer question
router.put('/test-answers/:id/grade', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  if (role !== 'teacher' && role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  try {
    const { data: answer } = await supabase
      .from('test_answers')
      .select('submission_id, question_id')
      .eq('id', req.params.id)
      .single();
    if (!answer) return res.status(404).json({ error: 'Answer not found' });

    const { data: submission } = await supabase
      .from('test_submissions')
      .select('test_id')
      .eq('id', answer.submission_id)
      .single();
    const { data: test } = await supabase
      .from('tests')
      .select('subject_id')
      .eq('id', submission.test_id)
      .single();

    if (role === 'teacher') {
      const assigned = await isAssignedTeacher(portal_id, test.subject_id);
      if (!assigned) return res.status(403).json({ error: 'Not assigned' });
    }

    const { marks_awarded, is_correct, teacher_feedback } = req.body;
    const { data, error } = await supabase
      .from('test_answers')
      .update({ marks_awarded, is_correct, teacher_feedback })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    // Recalculate total marks for the submission
    const { data: allAnswers } = await supabase
      .from('test_answers')
      .select('marks_awarded')
      .eq('submission_id', answer.submission_id);
    const newTotal = (allAnswers || []).reduce((sum, a) => sum + (a.marks_awarded || 0), 0);

    await supabase
      .from('test_submissions')
      .update({ total_marks_obtained: newTotal, manually_graded: true, status: 'graded' })
      .eq('id', answer.submission_id);

    res.json(data);
  } catch (err) {
    console.error('[tests]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PUT /api/tests/:id/release-results — teacher releases results
router.put('/tests/:id/release-results', async (req, res) => {
  const { role, portal_id } = req.portalUser;
  if (role !== 'teacher' && role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  try {
    const { data: test } = await supabase.from('tests').select('subject_id').eq('id', req.params.id).single();
    if (!test) return res.status(404).json({ error: 'Test not found' });

    if (role === 'teacher') {
      const assigned = await isAssignedTeacher(portal_id, test.subject_id);
      if (!assigned) return res.status(403).json({ error: 'Not assigned' });
    }

    const { released } = req.body;
    const { data, error } = await supabase
      .from('tests')
      .update({ results_released: released !== false, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[tests]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/offerings/:offeringId/results — student's own results for a subject offering
router.get('/offerings/:offeringId/results', async (req, res) => {
  const { role, portal_id, section_id } = req.portalUser;
  try {
    const { data: offering, error: offErr } = await supabase.from('subject_offerings').select('id, section_id, teacher_portal_id').eq('id', req.params.offeringId).single();
    if (offErr || !offering) return res.status(404).json({ error: 'Offering not found' });

    if (role === 'teacher' && offering.teacher_portal_id !== portal_id) return res.status(403).json({ error: 'Not authorized for this offering' });
    if (role === 'student' && offering.section_id !== section_id) return res.status(403).json({ error: 'Not authorized for this offering' });

    // Assignment results
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title, max_marks, unit_or_module')
      .eq('offering_id', req.params.offeringId)
      .in('status', ['published', 'closed']);

    let assignmentResults = [];
    if (role === 'student') {
      const aIds = (assignments || []).map(a => a.id);
      if (aIds.length > 0) {
        const { data: subs } = await supabase
          .from('assignment_submissions')
          .select('assignment_id, marks_obtained, feedback, status, graded_at')
          .eq('student_portal_id', portal_id)
          .in('assignment_id', aIds)
          .eq('status', 'graded');
        assignmentResults = (subs || []).map(s => {
          const a = assignments.find(x => x.id === s.assignment_id);
          return { ...s, title: a?.title, max_marks: a?.max_marks, unit_or_module: a?.unit_or_module, type: 'assignment' };
        });
      }
    }

    // Test results (only released)
    const { data: tests } = await supabase
      .from('tests')
      .select('id, title, max_marks, results_released')
      .eq('offering_id', req.params.offeringId)
      .eq('results_released', true);

    let testResults = [];
    if (role === 'student') {
      const tIds = (tests || []).map(t => t.id);
      if (tIds.length > 0) {
        const { data: tsubs } = await supabase
          .from('test_submissions')
          .select('test_id, total_marks_obtained, status, submitted_at')
          .eq('student_portal_id', portal_id)
          .in('test_id', tIds);
        testResults = (tsubs || []).map(s => {
          const t = tests.find(x => x.id === s.test_id);
          return { ...s, title: t?.title, max_marks: t?.max_marks, type: 'test' };
        });
      }
    } else {
      // Teacher/HOD/Admin: see all results
      const tIds = (tests || []).map(t => t.id);
      if (tIds.length > 0) {
        const { data: tsubs } = await supabase
          .from('test_submissions')
          .select('*')
          .in('test_id', tIds);
        testResults = (tsubs || []).map(s => {
          const t = tests.find(x => x.id === s.test_id);
          return { ...s, title: t?.title, max_marks: t?.max_marks, type: 'test' };
        });
      }
    }

    res.json({ assignmentResults, testResults });
  } catch (err) {
    console.error('[tests]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

export default router;
