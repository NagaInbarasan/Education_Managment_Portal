/**
 * Phazon Backend — Campus Academic Services Controller
 * Central Academic Calendar, Atomic Library Book Issuing with Concurrency Guard, Academic Support Tickets, and Phase 12 Notifications.
 */

'use strict';

const supabase = require('../config/supabase');
const { notifyClass, createNotification } = require('../services/notificationService');

const VALID_EVENT_TYPES = ['SEMESTER', 'EXAM', 'ASSESSMENT', 'ASSIGNMENT', 'HOLIDAY', 'ACADEMIC_EVENT', 'REGISTRATION', 'RESULT', 'DEADLINE', 'OTHER'];
const VALID_SUPPORT_CATEGORIES = ['ACADEMIC', 'ATTENDANCE', 'ASSIGNMENT', 'EXAM', 'RESULT', 'TIMETABLE', 'RESOURCE', 'FEES', 'GENERAL'];

// ==========================================
// PART A — ACADEMIC CALENDAR CONTROLLER
// ==========================================

async function getCalendarEvents(req, res, next) {
  try {
    const { userRole, classIds, departmentId } = req;
    const { event_type, visibility, month } = req.query;

    let query = supabase.from('academic_events').select('*');

    if (event_type) query = query.eq('event_type', event_type);

    if (userRole === 'student') {
      query = query.eq('status', 'PUBLISHED');
    }

    const { data: events, error } = await query.order('start_datetime', { ascending: true });
    if (error) throw error;

    return res.status(200).json({ success: true, data: events || [] });
  } catch (err) {
    next(err);
  }
}

async function createCalendarEvent(req, res, next) {
  try {
    const { title, description, event_type, start_datetime, end_datetime, visibility, department_id, class_id } = req.body;
    const { userId, userRole } = req;

    if (!['admin', 'hod', 'teacher'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Staff access required.' });
    }

    if (!title || !event_type || !start_datetime || !end_datetime) {
      return res.status(400).json({ success: false, message: 'title, event_type, start_datetime, and end_datetime are required.' });
    }

    if (end_datetime < start_datetime) {
      return res.status(400).json({ success: false, message: 'end_datetime must be on or after start_datetime.' });
    }

    const { data: event, error } = await supabase
      .from('academic_events')
      .insert([{
        title: title.trim(),
        description: description ? description.trim() : null,
        event_type: VALID_EVENT_TYPES.includes(event_type) ? event_type : 'ACADEMIC_EVENT',
        start_datetime,
        end_datetime,
        visibility: visibility || 'INSTITUTION',
        department_id: department_id || null,
        class_id: class_id || null,
        status: 'DRAFT',
        created_by: userId
      }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, message: 'Academic event created (DRAFT).', data: event });
  } catch (err) {
    next(err);
  }
}

async function publishCalendarEvent(req, res, next) {
  try {
    const { id } = req.params;
    const { userId, userRole } = req;

    if (!['admin', 'hod'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: HOD/Admin access required to publish.' });
    }

    const { data: event, error } = await supabase
      .from('academic_events')
      .update({ status: 'PUBLISHED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !event) return res.status(404).json({ success: false, message: 'Event not found.' });

    // Notification Trigger
    if (event.class_id) {
      notifyClass({
        class_id: event.class_id,
        sender_id: userId,
        type: 'ANNOUNCEMENT',
        title: 'New Academic Event Published',
        message: `Academic Event: "${event.title}" on ${new Date(event.start_datetime).toLocaleDateString()}`,
        entity_type: 'event',
        entity_id: event.id
      }).catch(err => console.error('[NotificationTrigger] Event publish error:', err.message));
    }

    return res.status(200).json({ success: true, message: 'Academic event published.', data: event });
  } catch (err) {
    next(err);
  }
}

async function updateCalendarEvent(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { userRole } = req;

    if (!['admin', 'hod', 'teacher'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { data: updated, error } = await supabase
      .from('academic_events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function deleteCalendarEvent(req, res, next) {
  try {
    const { id } = req.params;
    const { userRole } = req;

    if (!['admin', 'hod'].includes(userRole)) return res.status(403).json({ success: false, message: 'Forbidden' });

    const { error } = await supabase.from('academic_events').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Event deleted.' });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// PART B — LIBRARY MANAGEMENT CONTROLLER
// ==========================================

async function getLibraryBooks(req, res, next) {
  try {
    const { query: searchQuery, category } = req.query;

    let query = supabase.from('library_books').select('*, copies:library_copies(id, accession_number, status)');

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,isbn.ilike.%${searchQuery}%`);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: books, error } = await query.order('title', { ascending: true });
    if (error) throw error;

    // Attach copy count & availability
    const result = (books || []).map(b => {
      const copies = b.copies || [];
      const availableCopies = copies.filter(c => c.status === 'AVAILABLE').length;
      return {
        ...b,
        total_copies: copies.length,
        available_copies: availableCopies,
        is_available: availableCopies > 0
      };
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function createLibraryBook(req, res, next) {
  try {
    const { title, author, isbn, publisher, category, accession_numbers } = req.body;
    const { userRole } = req;

    if (!['admin', 'hod'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Staff access required.' });
    }

    if (!title || !author) {
      return res.status(400).json({ success: false, message: 'title and author are required.' });
    }

    const { data: book, error: bErr } = await supabase
      .from('library_books')
      .insert([{
        title: title.trim(),
        author: author.trim(),
        isbn: isbn ? isbn.trim() : null,
        publisher: publisher ? publisher.trim() : null,
        category: category || 'GENERAL'
      }])
      .select()
      .single();

    if (bErr) throw bErr;

    // Create initial copy accessions if provided
    if (accession_numbers && Array.isArray(accession_numbers)) {
      const copyObjects = accession_numbers.map(acc => ({
        book_id: book.id,
        accession_number: acc.trim(),
        status: 'AVAILABLE'
      }));
      await supabase.from('library_copies').insert(copyObjects);
    }

    return res.status(201).json({ success: true, data: book });
  } catch (err) {
    next(err);
  }
}

async function addBookCopy(req, res, next) {
  try {
    const { book_id, accession_number } = req.body;
    const { userRole } = req;

    if (!['admin', 'hod'].includes(userRole)) return res.status(403).json({ success: false, message: 'Forbidden' });

    if (!book_id || !accession_number) {
      return res.status(400).json({ success: false, message: 'book_id and accession_number are required.' });
    }

    const { data: copy, error } = await supabase
      .from('library_copies')
      .insert([{ book_id, accession_number: accession_number.trim(), status: 'AVAILABLE' }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data: copy });
  } catch (err) {
    next(err);
  }
}

async function getStudentLoans(req, res, next) {
  try {
    const { userRole, userId } = req;
    let targetStudentId = userId;

    if (['admin', 'hod'].includes(userRole) && req.query.student_id) {
      targetStudentId = req.query.student_id;
    }

    let query = supabase
      .from('library_loans')
      .select('*, copy:library_copies(accession_number, book:library_books(title, author, category))');

    if (userRole === 'student') {
      query = query.eq('student_id', targetStudentId);
    }

    const { data: loans, error } = await query.order('issued_at', { ascending: false });
    if (error) throw error;

    // Derive overdue status dynamically
    const nowIso = new Date().toISOString();
    const result = (loans || []).map(l => {
      let derivedStatus = l.status;
      if (l.status === 'ACTIVE' && l.due_at < nowIso) {
        derivedStatus = 'OVERDUE';
      }
      return { ...l, status: derivedStatus };
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Atomic Concurrency-Safe Book Issuing
 */
async function issueBookCopy(req, res, next) {
  try {
    const { copy_id, student_id, loan_days } = req.body;
    const { userId, userRole } = req;

    if (!['admin', 'hod'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only library/admin staff can issue books.' });
    }

    if (!copy_id || !student_id) {
      return res.status(400).json({ success: false, message: 'copy_id and student_id are required.' });
    }

    // Atomic Concurrency Guard: Atomically claim copy only if AVAILABLE
    const { data: claimedCopy, error: claimErr } = await supabase
      .from('library_copies')
      .update({ status: 'BORROWED' })
      .eq('id', copy_id)
      .eq('status', 'AVAILABLE')
      .select('*, book:library_books(title)')
      .maybeSingle();

    if (claimErr || !claimedCopy) {
      return res.status(400).json({
        success: false,
        message: 'Book copy is no longer available or is already borrowed.'
      });
    }

    const days = parseInt(loan_days || 14, 10);
    const dueAtDate = new Date();
    dueAtDate.setDate(dueAtDate.getDate() + days);

    // Insert Loan Record
    const { data: loan, error: loanErr } = await supabase
      .from('library_loans')
      .insert([{
        copy_id,
        student_id,
        issued_at: new Date().toISOString(),
        due_at: dueAtDate.toISOString(),
        status: 'ACTIVE',
        issued_by: userId
      }])
      .select()
      .single();

    if (loanErr) throw loanErr;

    // Trigger Notification to Student
    createNotification({
      user_id: student_id,
      sender_id: userId,
      type: 'ANNOUNCEMENT',
      title: 'Library Book Issued',
      message: `Library Book Issued: "${claimedCopy.book?.title || 'Book'}". Due Date: ${dueAtDate.toLocaleDateString()}`,
      entity_type: 'loan',
      entity_id: loan.id
    }).catch(err => console.error('[NotificationTrigger] Library issue error:', err.message));

    return res.status(201).json({ success: true, message: 'Book copy issued successfully.', data: loan });
  } catch (err) {
    next(err);
  }
}

async function returnBookCopy(req, res, next) {
  try {
    const { id } = req.params; // loan_id
    const { userId, userRole } = req;

    if (!['admin', 'hod'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only library/admin staff can return books.' });
    }

    const { data: loan, error: lErr } = await supabase.from('library_loans').select('*, copy:library_copies(id, book:library_books(title))').eq('id', id).single();
    if (lErr || !loan) return res.status(404).json({ success: false, message: 'Loan record not found.' });

    if (loan.status === 'RETURNED') {
      return res.status(400).json({ success: false, message: 'This book loan has already been returned.' });
    }

    // Update Loan Record
    const { data: returnedLoan, error: rErr } = await supabase
      .from('library_loans')
      .update({
        returned_at: new Date().toISOString(),
        status: 'RETURNED',
        returned_by: userId
      })
      .eq('id', id)
      .select()
      .single();

    if (rErr) throw rErr;

    // Reset Copy Status to AVAILABLE
    await supabase.from('library_copies').update({ status: 'AVAILABLE' }).eq('id', loan.copy_id);

    // Trigger Notification
    createNotification({
      user_id: loan.student_id,
      sender_id: userId,
      type: 'ANNOUNCEMENT',
      title: 'Library Book Returned',
      message: `Library Book Returned: "${loan.copy?.book?.title || 'Book'}". Thank you!`,
      entity_type: 'loan',
      entity_id: id
    }).catch(err => console.error('[NotificationTrigger] Library return error:', err.message));

    return res.status(200).json({ success: true, message: 'Book copy returned successfully.', data: returnedLoan });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// PART C — STUDENT SUPPORT TICKET CONTROLLER
// ==========================================

async function getSupportRequests(req, res, next) {
  try {
    const { userRole, userId, departmentId } = req;

    let query = supabase
      .from('support_requests')
      .select('*, student:users!support_requests_student_id_fkey(name, email)');

    if (userRole === 'student') {
      query = query.eq('student_id', userId);
    } else if (userRole === 'hod' && departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data: requests, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    return res.status(200).json({ success: true, data: requests || [] });
  } catch (err) {
    next(err);
  }
}

async function createSupportRequest(req, res, next) {
  try {
    const { category, subject, description, priority } = req.body;
    const { userId, userRole, departmentId } = req;

    if (userRole !== 'student') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only students can submit academic support requests.' });
    }

    if (!category || !subject || !description) {
      return res.status(400).json({ success: false, message: 'category, subject, and description are required.' });
    }

    if (!VALID_SUPPORT_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: `Invalid category. Must be one of: ${VALID_SUPPORT_CATEGORIES.join(', ')}` });
    }

    const { data: ticket, error } = await supabase
      .from('support_requests')
      .insert([{
        student_id: userId,
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority: priority || 'MEDIUM',
        status: 'OPEN',
        department_id: departmentId || null
      }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, message: 'Support ticket submitted.', data: ticket });
  } catch (err) {
    next(err);
  }
}

async function respondSupportRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { response_comment } = req.body;
    const { userId, userRole } = req;

    if (!['admin', 'hod', 'teacher'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Staff access required.' });
    }

    if (!response_comment) {
      return res.status(400).json({ success: false, message: 'response_comment is required.' });
    }

    const { data: existing } = await supabase.from('support_requests').select('*').eq('id', id).single();
    if (!existing) return res.status(404).json({ success: false, message: 'Support request not found.' });

    const { data: updated, error } = await supabase
      .from('support_requests')
      .update({
        status: 'IN_REVIEW',
        response_comment: response_comment.trim(),
        assigned_to: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Trigger Notification to Student
    createNotification({
      user_id: existing.student_id,
      sender_id: userId,
      type: 'ANNOUNCEMENT',
      title: 'Support Ticket Update',
      message: `Staff Response on Ticket #${id.slice(0, 6)}: ${response_comment}`,
      entity_type: 'support',
      entity_id: id
    }).catch(err => console.error('[NotificationTrigger] Support response error:', err.message));

    return res.status(200).json({ success: true, message: 'Response saved.', data: updated });
  } catch (err) {
    next(err);
  }
}

async function resolveSupportRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { response_comment } = req.body;
    const { userId, userRole } = req;

    if (!['admin', 'hod', 'teacher'].includes(userRole)) return res.status(403).json({ success: false, message: 'Forbidden' });

    const { data: existing } = await supabase.from('support_requests').select('*').eq('id', id).single();
    if (!existing) return res.status(404).json({ success: false, message: 'Support request not found.' });

    const { data: resolved, error } = await supabase
      .from('support_requests')
      .update({
        status: 'RESOLVED',
        response_comment: response_comment ? response_comment.trim() : existing.response_comment,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Trigger Notification
    createNotification({
      user_id: existing.student_id,
      sender_id: userId,
      type: 'ANNOUNCEMENT',
      title: 'Support Ticket Resolved',
      message: `Your support ticket regarding "${existing.subject}" has been RESOLVED.`,
      entity_type: 'support',
      entity_id: id
    }).catch(err => console.error('[NotificationTrigger] Support resolve error:', err.message));

    return res.status(200).json({ success: true, message: 'Ticket resolved.', data: resolved });
  } catch (err) {
    next(err);
  }
}

async function closeSupportRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { userId, userRole } = req;

    const { data: existing } = await supabase.from('support_requests').select('*').eq('id', id).single();
    if (!existing) return res.status(404).json({ success: false, message: 'Support request not found.' });

    if (userRole === 'student' && existing.student_id !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { data: closed, error } = await supabase
      .from('support_requests')
      .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Support ticket closed.', data: closed });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCalendarEvents,
  createCalendarEvent,
  publishCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getLibraryBooks,
  createLibraryBook,
  addBookCopy,
  getStudentLoans,
  issueBookCopy,
  returnBookCopy,
  getSupportRequests,
  createSupportRequest,
  respondSupportRequest,
  resolveSupportRequest,
  closeSupportRequest,
};
