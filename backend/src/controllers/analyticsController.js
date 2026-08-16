/**
 * Phazon Backend — Analytics Controller (Phase 18 Management Intelligence)
 * HTTP handlers for role-specific academic analytics, risk indicators, fee analytics, resource metrics, and exportable CSV reports.
 */

'use strict';

const {
  getStudentOverview,
  getTeacherOverview,
  getDepartmentOverview,
  getAdminOverview,
  formatCsvReport,
} = require('../services/analyticsService');
const { assertDepartmentScope } = require('../middleware/scopeGuard');
const supabase = require('../config/supabase');

async function getStudentAnalytics(req, res, next) {
  try {
    let studentId = req.userId;

    if (req.query.student_id) {
      if (['admin', 'hod', 'teacher'].includes(req.userRole)) {
        studentId = req.query.student_id;
      } else {
        return res.status(403).json({ success: false, message: 'Forbidden: Cannot view another student analytics' });
      }
    }

    const data = await getStudentOverview(studentId, req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getTeacherAnalytics(req, res, next) {
  try {
    const teacherId = (req.query.teacher_id && req.userRole === 'admin') 
      ? req.query.teacher_id 
      : req.userId;

    const data = await getTeacherOverview(teacherId, req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getHodAnalytics(req, res, next) {
  try {
    let departmentId = req.departmentId;

    if (req.userRole === 'admin' && req.query.department_id) {
      departmentId = req.query.department_id;
    } else if (req.userRole === 'hod') {
      assertDepartmentScope(req, departmentId);
    }

    if (!departmentId) {
      return res.status(400).json({ success: false, message: 'Department ID is required' });
    }

    const data = await getDepartmentOverview(departmentId, req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getAdminAnalytics(req, res, next) {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
    }
    const data = await getAdminOverview(req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/fees
 * Fee Analytics (Phase 15 integration)
 */
async function getFeeAnalytics(req, res, next) {
  try {
    const { userRole, departmentId } = req;

    if (userRole === 'student') {
      return res.status(403).json({ success: false, message: 'Forbidden: Students cannot access management fee analytics.' });
    }
    if (userRole === 'teacher') {
      return res.status(403).json({ success: false, message: 'Forbidden: Teachers cannot access management fee analytics.' });
    }

    let query = supabase.from('student_fees').select('amount_due, amount_paid, balance, status, student:users!student_fees_student_id_fkey(name, department_id)');

    if (userRole === 'hod' && departmentId) {
      // Filter by department
      const { data: deptStudents } = await supabase.from('student_enrollments').select('student_id, class:classes(department_id)').eq('class.department_id', departmentId);
      const studentIds = deptStudents ? deptStudents.map(s => s.student_id) : [];
      query = query.in('student_id', studentIds);
    }

    const { data: fees, error } = await query;
    if (error) throw error;

    let totalBilled = 0, totalPaid = 0, totalOutstanding = 0;
    (fees || []).forEach(f => {
      totalBilled += parseFloat(f.amount_due || 0);
      totalPaid += parseFloat(f.amount_paid || 0);
      totalOutstanding += parseFloat(f.balance || 0);
    });

    const paidPct = totalBilled > 0 ? parseFloat(((totalPaid / totalBilled) * 100).toFixed(2)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        total_billed: totalBilled,
        total_paid: totalPaid,
        total_outstanding: totalOutstanding,
        collection_percentage: paidPct,
        total_records: (fees || []).length
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/risk
 * Academic Risk Indicators
 */
async function getRiskAnalytics(req, res, next) {
  try {
    const { userRole, departmentId } = req;

    if (userRole === 'student') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    let departmentToQuery = departmentId;
    if (userRole === 'admin' && req.query.department_id) {
      departmentToQuery = req.query.department_id;
    }

    if (userRole === 'hod' && !departmentToQuery) {
      return res.status(400).json({ success: false, message: 'Department ID is required' });
    }

    let studentIds = [];
    if (departmentToQuery) {
      const { data: deptClasses } = await supabase.from('classes').select('id').eq('department_id', departmentToQuery);
      const cIds = deptClasses ? deptClasses.map(c => c.id) : [];
      const { data: enrollments } = await supabase.from('student_enrollments').select('student_id').in('class_id', cIds);
      studentIds = enrollments ? [...new Set(enrollments.map(e => e.student_id))] : [];
    } else {
      const { data: students } = await supabase.from('users').select('id').eq('role', 'student');
      studentIds = students ? students.map(s => s.id) : [];
    }

    const atRiskList = [];
    for (const sId of studentIds) {
      const perf = await getStudentOverview(sId);
      if (perf.isAtRisk) {
        const { data: u } = await supabase.from('users').select('name, email').eq('id', sId).single();
        atRiskList.push({
          student_id: sId,
          student_name: u?.name || 'Student',
          email: u?.email || '',
          risk_indicators: perf.academicFlags.map(f => f.reason)
        });
      }
    }

    return res.status(200).json({ success: true, data: atRiskList });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/export
 * Exportable Analytics CSV Report
 */
async function exportAnalyticsReport(req, res, next) {
  try {
    const { userRole, departmentId } = req;
    const { type } = req.query;

    if (userRole === 'student') {
      return res.status(403).json({ success: false, message: 'Forbidden: Students cannot export management reports.' });
    }

    let reportData = null;
    if (userRole === 'admin') {
      reportData = await getAdminOverview(req.query);
    } else {
      reportData = await getDepartmentOverview(departmentId, req.query);
    }

    const csvContent = formatCsvReport(reportData, type || 'MANAGEMENT_ANALYTICS');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=phazon-analytics-report-${Date.now()}.csv`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStudentAnalytics,
  getTeacherAnalytics,
  getHodAnalytics,
  getAdminAnalytics,
  getFeeAnalytics,
  getRiskAnalytics,
  exportAnalyticsReport,
};
