import jwt from 'jsonwebtoken';
import supabase from './supabase.js';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Auth middleware: verifies JWT Bearer token OR legacy X-Portal-ID header.
 * Sets req.portalUser = { portal_id, name, role, department, department_id, section_id, batch_year } on success.
 * Rejects with 401 if authentication fails.
 */
export async function authMiddleware(req, res, next) {
  let portalId = null;

  // Primary: JWT Bearer token
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ') && process.env.JWT_SECRET) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      portalId = decoded.portal_id;
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired. Please sign in again.' });
      }
      return res.status(401).json({ error: 'Invalid token.' });
    }
  }

  // Fallback: legacy X-Portal-ID header (ONLY in development/test — disabled in production)
  if (!portalId && process.env.NODE_ENV !== 'production') {
    portalId = req.headers['x-portal-id'];
  }

  if (!portalId) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const { data: user, error } = await supabase
    .from('portal_users')
    .select('portal_id, name, role, department, department_id, section_id, batch_year')
    .eq('portal_id', portalId)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid credentials. Contact Admin.' });
  }

  // Attach server-resolved user to the request — NEVER trust client-provided role
  req.portalUser = user;
  next();
}

/**
 * Role guard: restrict route to specific roles.
 * Usage: requireRole('teacher', 'admin')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.portalUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.portalUser.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
    }
    next();
  };
}

/**
 * Check if user is a teacher assigned to the given subject offering.
 */
export async function isAssignedToOffering(portalId, offeringId) {
  const { data } = await supabase
    .from('subject_offerings')
    .select('id')
    .eq('id', offeringId)
    .eq('teacher_portal_id', portalId)
    .eq('status', 'active')
    .single();
  return !!data;
}

/**
 * Check if user is a teacher assigned to the given subject (via any offering).
 */
export async function isAssignedTeacher(portalId, subjectId) {
  const { data } = await supabase
    .from('subject_offerings')
    .select('id')
    .eq('subject_id', subjectId)
    .eq('teacher_portal_id', portalId)
    .eq('status', 'active')
    .limit(1);
  return data && data.length > 0;
}

/**
 * Check if student is enrolled via their section having an offering for the subject.
 */
export async function isEnrolledStudent(portalId, subjectId) {
  // Get student's section
  const { data: student } = await supabase
    .from('portal_users')
    .select('section_id')
    .eq('portal_id', portalId)
    .single();

  if (!student || !student.section_id) {
    // Fallback: check legacy subject_enrollments
    const { data: legacy } = await supabase
      .from('subject_enrollments')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('student_portal_id', portalId)
      .single();
    return !!legacy;
  }

  // Check if there's an offering for this subject in the student's section
  const { data: offering } = await supabase
    .from('subject_offerings')
    .select('id')
    .eq('subject_id', subjectId)
    .eq('section_id', student.section_id)
    .eq('status', 'active')
    .single();
  return !!offering;
}

/**
 * Check if portalId is the HOD of the given department.
 */
export async function isDepartmentHod(portalId, departmentId) {
  const { data } = await supabase
    .from('departments')
    .select('id')
    .eq('id', departmentId)
    .eq('hod_portal_id', portalId)
    .single();
  return !!data;
}

/**
 * Get the department ID that this HOD manages.
 */
export async function getHodDepartmentId(portalId) {
  const { data } = await supabase
    .from('departments')
    .select('id')
    .eq('hod_portal_id', portalId)
    .single();
  return data ? data.id : null;
}

/**
 * Check if user can access a specific offering based on role.
 */
export async function canAccessOffering(portalUser, offeringId) {
  const { role, portal_id } = portalUser;
  if (role === 'admin') return true;

  // Get offering details
  const { data: offering } = await supabase
    .from('subject_offerings')
    .select('id, subject_id, section_id, teacher_portal_id, sections!inner(department_id)')
    .eq('id', offeringId)
    .single();

  if (!offering) return false;

  if (role === 'teacher' || role === 'hod') {
    // Teacher/HOD can access if they are the assigned teacher
    if (offering.teacher_portal_id === portal_id) return true;
  }

  if (role === 'hod') {
    // HOD can also access any offering in their department (department management)
    const hodDeptId = await getHodDepartmentId(portal_id);
    if (hodDeptId && offering.sections?.department_id === hodDeptId) return true;
  }

  if (role === 'student') {
    // Student can access if offering is in their section
    const sectionId = portalUser.section_id;
    if (sectionId && offering.section_id === sectionId) return true;
  }

  return false;
}

/**
 * Check if user can access the subject based on role.
 * Updated for offering model with fallback to legacy tables.
 */
export async function canAccessSubject(portalUser, subjectId) {
  const { role, portal_id, department } = portalUser;
  if (role === 'admin') return true;

  if (role === 'teacher' || role === 'hod') {
    // Check if assigned via offerings
    const isAssigned = await isAssignedTeacher(portal_id, subjectId);
    if (isAssigned) return true;

    // HOD can access subjects offered in their department
    if (role === 'hod') {
      const hodDeptId = await getHodDepartmentId(portal_id);
      if (hodDeptId) {
        const { data: offerings } = await supabase
          .from('subject_offerings')
          .select('id, sections!inner(department_id)')
          .eq('subject_id', subjectId)
          .eq('sections.department_id', hodDeptId)
          .limit(1);
        if (offerings && offerings.length > 0) return true;
      }
    }

    // Fallback: legacy subject_teachers
    const { data: legacy } = await supabase
      .from('subject_teachers')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('teacher_portal_id', portal_id)
      .single();
    if (legacy) return true;
  }

  if (role === 'student') {
    return await isEnrolledStudent(portal_id, subjectId);
  }

  if (role === 'hod') {
    // Fallback: legacy string-based department check
    const { data: subject } = await supabase
      .from('subjects')
      .select('department')
      .eq('id', subjectId)
      .single();
    return subject && subject.department === department;
  }

  return false;
}

/**
 * Middleware: ensure the requesting HOD owns the department, or user is admin.
 * Expects req.params.deptId or req.params.departmentId
 */
export function requireDepartmentAccess() {
  return async (req, res, next) => {
    const { role, portal_id } = req.portalUser;
    const deptId = req.params.deptId || req.params.departmentId;

    if (role === 'admin') return next();

    if (role === 'hod') {
      const isHod = await isDepartmentHod(portal_id, deptId);
      if (isHod) return next();
    }

    return res.status(403).json({ error: 'Access denied. You do not manage this department.' });
  };
}

/**
 * Check if portalId is the class advisor OR mentor for a given section.
 */
export async function isClassAdvisor(portalId, sectionId) {
  const { data } = await supabase
    .from('sections')
    .select('id')
    .eq('id', sectionId)
    .or(`class_advisor_portal_id.eq.${portalId},mentor_portal_id.eq.${portalId}`)
    .single();
  return !!data;
}

/**
 * Check if user can edit a section's timetable.
 * Allowed: admin, HOD of the section's department, class advisor/mentor of the section.
 * Returns { allowed: boolean, reason?: string }
 */
export async function canEditSectionTimetable(portalUser, sectionId) {
  const { role, portal_id } = portalUser;

  // Admin: full access
  if (role === 'admin') return { allowed: true };

  // Student: never
  if (role === 'student') return { allowed: false, reason: 'Students cannot edit timetables.' };

  // Get section's department
  const { data: section } = await supabase
    .from('sections')
    .select('id, department_id, class_advisor_portal_id, mentor_portal_id')
    .eq('id', sectionId)
    .single();

  if (!section) return { allowed: false, reason: 'Section not found.' };

  // HOD: can edit any section in their department
  if (role === 'hod') {
    const hodDeptId = await getHodDepartmentId(portal_id);
    if (hodDeptId && section.department_id === hodDeptId) return { allowed: true };
    return { allowed: false, reason: 'You can only edit timetables in your department.' };
  }

  // Teacher: only if class advisor or mentor of this section
  if (role === 'teacher') {
    if (section.class_advisor_portal_id === portal_id || section.mentor_portal_id === portal_id) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Only class advisors, mentors, HOD, or admin can edit timetables.' };
  }

  return { allowed: false, reason: 'Access denied.' };
}
