/**
 * Phazon Backend — Academic Fees & Finance Controller
 * Deterministic financial calculations, fee assignments, payment recording, receipts, and Phase 12 notifications.
 */

'use strict';

const supabase = require('../config/supabase');
const { createNotification } = require('../services/notificationService');

const VALID_FEE_TYPES = ['TUITION', 'EXAM', 'LAB', 'LIBRARY', 'OTHER'];
const VALID_PAYMENT_METHODS = ['BANK_TRANSFER', 'CASH', 'CARD', 'ONLINE_SIMULATION', 'OTHER'];

/**
 * GET /api/fees/structures
 */
async function getFeeStructures(req, res, next) {
  try {
    const { department_id, fee_type } = req.query;

    let query = supabase.from('fee_structures').select('*, department:departments(name, code)').eq('is_active', true);
    if (department_id) query = query.eq('department_id', department_id);
    if (fee_type) query = query.eq('fee_type', fee_type);

    const { data: structures, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    return res.status(200).json({ success: true, data: structures || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/fees/structures
 */
async function createFeeStructure(req, res, next) {
  try {
    const { name, description, fee_type, academic_year_id, semester_id, department_id, amount, due_date } = req.body;
    const { userId, userRole } = req;

    if (!['admin', 'hod'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Staff access required.' });
    }

    if (!name || !fee_type || !amount || !due_date) {
      return res.status(400).json({ success: false, message: 'name, fee_type, amount, and due_date are required.' });
    }

    if (!VALID_FEE_TYPES.includes(fee_type)) {
      return res.status(400).json({ success: false, message: `Invalid fee_type. Must be one of: ${VALID_FEE_TYPES.join(', ')}` });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }

    const { data: structure, error } = await supabase
      .from('fee_structures')
      .insert([{
        name: name.trim(),
        description: description ? description.trim() : null,
        fee_type,
        academic_year_id: academic_year_id || null,
        semester_id: semester_id || null,
        department_id: department_id || (userRole === 'hod' ? req.departmentId : null),
        amount: numericAmount,
        currency: 'INR',
        due_date,
        is_active: true,
        created_by: userId
      }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data: structure });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/fees/assign
 * Assign a fee structure to a student or all students in a class.
 */
async function assignStudentFee(req, res, next) {
  try {
    const { fee_structure_id, student_id, class_id } = req.body;
    const { userId, userRole } = req;

    if (!['admin', 'hod'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Staff access required.' });
    }

    if (!fee_structure_id || (!student_id && !class_id)) {
      return res.status(400).json({ success: false, message: 'fee_structure_id and either student_id or class_id are required.' });
    }

    // Fetch fee structure details
    const { data: feeStruct, error: structErr } = await supabase
      .from('fee_structures')
      .select('*')
      .eq('id', fee_structure_id)
      .single();

    if (structErr || !feeStruct) {
      return res.status(404).json({ success: false, message: 'Fee structure not found.' });
    }

    let targetStudentIds = [];
    if (student_id) {
      targetStudentIds.push(student_id);
    } else if (class_id) {
      const { data: enrollments } = await supabase.from('student_enrollments').select('student_id').eq('class_id', class_id);
      targetStudentIds = enrollments ? enrollments.map(e => e.student_id) : [];
    }

    if (targetStudentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No eligible students found to assign fee.' });
    }

    const assignedRecords = [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const isOverdue = feeStruct.due_date < todayStr;
    const initialStatus = isOverdue ? 'OVERDUE' : 'PENDING';

    for (const stId of targetStudentIds) {
      // Check existing assignment
      const { data: existing } = await supabase
        .from('student_fees')
        .select('id')
        .eq('student_id', stId)
        .eq('fee_structure_id', fee_structure_id)
        .maybeSingle();

      if (!existing) {
        const { data: sf, error: sfErr } = await supabase
          .from('student_fees')
          .insert([{
            student_id: stId,
            fee_structure_id: fee_structure_id,
            amount_due: feeStruct.amount,
            amount_paid: 0.00,
            balance: feeStruct.amount,
            due_date: feeStruct.due_date,
            status: initialStatus
          }])
          .select()
          .single();

        if (!sfErr && sf) {
          assignedRecords.push(sf);

          // Dispatch Notification to Student
          createNotification({
            user_id: stId,
            sender_id: userId,
            type: 'ANNOUNCEMENT',
            title: 'New Academic Fee Assigned',
            message: `Fee Assigned: "${feeStruct.name}" (Amount: ₹${feeStruct.amount}, Due: ${feeStruct.due_date})`,
            entity_type: 'fee',
            entity_id: sf.id
          }).catch(err => console.error('[NotificationTrigger] Fee assign notification error:', err.message));
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: `Assigned fee structure to ${assignedRecords.length} student(s).`,
      assigned_count: assignedRecords.length
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/fees/my-fees
 * Student fetches own fee assignments and summary metrics.
 */
async function getMyFees(req, res, next) {
  try {
    const { userRole, userId } = req;
    let targetStudentId = userId;

    if (userRole === 'teacher') {
      return res.status(403).json({ success: false, message: 'Forbidden: Teachers do not have access to student finance records.' });
    }

    // Allow Admin/HOD to view a specific student's fees via query param
    if (['admin', 'hod'].includes(userRole) && req.query.student_id) {
      targetStudentId = req.query.student_id;
    }

    const { data: fees, error } = await supabase
      .from('student_fees')
      .select('*, fee_structure:fee_structures(name, description, fee_type, currency)')
      .eq('student_id', targetStudentId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const feeList = fees || [];
    let totalAssigned = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let totalOverdue = 0;

    feeList.forEach(f => {
      const due = parseFloat(f.amount_due || 0);
      const paid = parseFloat(f.amount_paid || 0);
      const bal = parseFloat(f.balance || 0);

      totalAssigned += due;
      totalPaid += paid;
      totalBalance += bal;
      if (f.status === 'OVERDUE') {
        totalOverdue += bal;
      }
    });

    return res.status(200).json({
      success: true,
      summary: {
        total_assigned: totalAssigned,
        total_paid: totalPaid,
        total_balance: totalBalance,
        total_overdue: totalOverdue,
        currency: 'INR'
      },
      data: feeList
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/fees/my-payments
 * Fetch payment transaction log.
 */
async function getMyPayments(req, res, next) {
  try {
    const { userRole, userId } = req;
    let targetStudentId = userId;

    if (userRole === 'teacher') {
      return res.status(403).json({ success: false, message: 'Forbidden: Teachers do not have access to financial records.' });
    }

    if (['admin', 'hod'].includes(userRole) && req.query.student_id) {
      targetStudentId = req.query.student_id;
    }

    const { data: payments, error } = await supabase
      .from('payments')
      .select('*, student_fee:student_fees(id, fee_structure:fee_structures(name, fee_type))')
      .eq('student_id', targetStudentId)
      .order('paid_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data: payments || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/fees/payments
 * Record a payment with deterministic status derivation and overpayment rejection.
 */
async function recordPayment(req, res, next) {
  try {
    const { student_fee_id, amount, payment_method, payment_reference } = req.body;
    const { userId, userRole } = req;

    if (!['admin', 'hod'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Staff access required to record payments.' });
    }

    if (!student_fee_id || !amount || !payment_method) {
      return res.status(400).json({ success: false, message: 'student_fee_id, amount, and payment_method are required.' });
    }

    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({ success: false, message: `Invalid payment_method. Must be one of: ${VALID_PAYMENT_METHODS.join(', ')}` });
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a positive number.' });
    }

    // Fetch existing student fee record
    const { data: sf, error: sfErr } = await supabase
      .from('student_fees')
      .select('*, fee_structure:fee_structures(name)')
      .eq('id', student_fee_id)
      .single();

    if (sfErr || !sf) {
      return res.status(404).json({ success: false, message: 'Student fee record not found.' });
    }

    const currentBalance = parseFloat(sf.balance || 0);

    // Overpayment Protection Check
    if (paymentAmount > currentBalance + 0.01) { // 0.01 margin for precision
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${paymentAmount}) exceeds remaining balance (₹${currentBalance}). Overpayment is not allowed.`
      });
    }

    const newAmountPaid = parseFloat((parseFloat(sf.amount_paid || 0) + paymentAmount).toFixed(2));
    const amountDue = parseFloat(sf.amount_due || 0);
    const newBalance = parseFloat((amountDue - newAmountPaid).toFixed(2));

    // Derive Status
    const todayStr = new Date().toISOString().slice(0, 10);
    let newStatus = 'PENDING';
    if (newAmountPaid >= amountDue - 0.01) {
      newStatus = 'PAID';
    } else if (newAmountPaid > 0) {
      newStatus = 'PARTIAL';
    } else if (sf.due_date < todayStr) {
      newStatus = 'OVERDUE';
    }

    // Generate unique payment reference if not provided
    const refStr = payment_reference || `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Insert Payment Transaction Record
    const { data: paymentRecord, error: payErr } = await supabase
      .from('payments')
      .insert([{
        student_fee_id: sf.id,
        student_id: sf.student_id,
        amount: paymentAmount,
        payment_reference: refStr,
        payment_method,
        status: 'SUCCESS',
        paid_at: new Date().toISOString(),
        recorded_by: userId
      }])
      .select()
      .single();

    if (payErr) throw payErr;

    // Update Student Fee Record
    const { data: updatedSf, error: updateErr } = await supabase
      .from('student_fees')
      .update({
        amount_paid: newAmountPaid,
        balance: Math.max(0, newBalance),
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', sf.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Trigger Notification to Student
    createNotification({
      user_id: sf.student_id,
      sender_id: userId,
      type: 'ANNOUNCEMENT',
      title: 'Payment Successfully Recorded',
      message: `Payment Recorded: ₹${paymentAmount} for "${sf.fee_structure?.name || 'Fee'}". Receipt Ref: ${refStr}`,
      entity_type: 'payment',
      entity_id: paymentRecord.id
    }).catch(err => console.error('[NotificationTrigger] Payment notification error:', err.message));

    return res.status(201).json({
      success: true,
      message: 'Payment successfully recorded.',
      data: {
        payment: paymentRecord,
        updated_fee: updatedSf
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/fees/payments/:id/receipt
 * Generate receipt detail for authorized user.
 */
async function getReceipt(req, res, next) {
  try {
    const { id } = req.params;
    const { userId, userRole } = req;

    const { data: payment, error } = await supabase
      .from('payments')
      .select('*, student:users!payments_student_id_fkey(name, email), student_fee:student_fees(amount_due, balance, fee_structure:fee_structures(name, fee_type))')
      .eq('id', id)
      .single();

    if (error || !payment) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    // Receipt Security Check
    if (userRole === 'student' && payment.student_id !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot access another student\'s receipt.' });
    }
    if (userRole === 'teacher') {
      return res.status(403).json({ success: false, message: 'Forbidden: Teachers cannot access payment receipts.' });
    }

    const receipt = {
      receipt_number: payment.payment_reference,
      institution_name: 'Phazon Academic & Intelligence Platform',
      student_name: payment.student?.name || 'Student',
      student_email: payment.student?.email || '',
      fee_title: payment.student_fee?.fee_structure?.name || 'Academic Fee',
      fee_category: payment.student_fee?.fee_structure?.fee_type || 'TUITION',
      amount_paid: payment.amount,
      currency: 'INR',
      payment_method: payment.payment_method,
      status: payment.status,
      paid_at: payment.paid_at
    };

    return res.status(200).json({ success: true, data: receipt });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/fees/dashboard
 * Aggregated finance collection statistics for Admin/HOD.
 */
async function getFinanceDashboard(req, res, next) {
  try {
    const { userRole, departmentId } = req;

    if (!['admin', 'hod'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Staff access required.' });
    }

    let feeQuery = supabase.from('student_fees').select('amount_due, amount_paid, balance, status, student_id');

    // H7 FIX: HOD should only see fees for students in their department
    if (userRole === 'hod' && departmentId) {
      const { data: deptClasses } = await supabase.from('classes').select('id').eq('department_id', departmentId);
      const cIds = deptClasses ? deptClasses.map(c => c.id) : [];
      if (cIds.length > 0) {
        const { data: enrollments } = await supabase.from('student_enrollments').select('student_id').in('class_id', cIds);
        const studentIds = enrollments ? [...new Set(enrollments.map(e => e.student_id))] : [];
        if (studentIds.length > 0) {
          feeQuery = feeQuery.in('student_id', studentIds);
        } else {
          return res.status(200).json({
            success: true,
            data: { total_assigned: 0, total_collected: 0, total_outstanding: 0, total_overdue: 0, collection_rate_percent: 0, currency: 'INR' }
          });
        }
      }
    }

    const { data: allFees } = await feeQuery;

    let totalAssigned = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;

    if (allFees) {
      allFees.forEach(f => {
        const due = parseFloat(f.amount_due || 0);
        const paid = parseFloat(f.amount_paid || 0);
        const bal = parseFloat(f.balance || 0);

        totalAssigned += due;
        totalCollected += paid;
        totalOutstanding += bal;
        if (f.status === 'OVERDUE') {
          totalOverdue += bal;
        }
      });
    }

    const collectionRate = totalAssigned > 0 ? parseFloat(((totalCollected / totalAssigned) * 100).toFixed(2)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        total_assigned: totalAssigned,
        total_collected: totalCollected,
        total_outstanding: totalOutstanding,
        total_overdue: totalOverdue,
        collection_rate_percent: collectionRate,
        currency: 'INR'
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFeeStructures,
  createFeeStructure,
  assignStudentFee,
  getMyFees,
  getMyPayments,
  recordPayment,
  getReceipt,
  getFinanceDashboard,
};
