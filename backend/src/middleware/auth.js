/**
 * Phazon Backend — Authentication & RBAC Middleware
 *
 * Verifies Supabase JWT access tokens from the Authorization header:
 *   Authorization: Bearer <access_token>
 *
 * Attaches to req:
 *   req.user         — raw Supabase auth user object
 *   req.userId       — authenticated user's UUID (from JWT, immutable)
 *   req.userRole     — application role from public.users (authoritative, never from body)
 *   req.departmentId — department_id from public.users (null for admin/global)
 *   req.classIds     — array of class UUIDs the user is scoped to:
 *                        teacher: classes from teacher_assignments
 *                        student: classes from student_enrollments
 *                        hod/admin: null (means "all in their scope")
 *
 * SECURITY RULES:
 *   - Role is ALWAYS derived from the verified JWT + public.users lookup.
 *   - Role is NEVER trusted from req.body, req.query, or req.params.
 *   - requireRole() enforces role-based access at the route level.
 *   - requireSelf() enforces that a user can only access their own resources.
 */

'use strict';

const supabase = require('../config/supabase');

/**
 * requireAuth
 * Verifies the Bearer token and enriches req with user identity + scope.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Missing or malformed Authorization header.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Step 1: Verify token with Supabase Auth API (authoritative)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired access token.',
      });
    }

    req.user   = user;
    req.userId = user.id;

    // Step 2: Fetch role, department, and active status from public.users
    // This is the authoritative source — not user_metadata in the JWT.
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, department_id, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      // If we can't read the profile, deny access
      return res.status(500).json({
        success: false,
        message: 'Failed to verify user profile.',
      });
    }

    if (profile) {
      if (profile.is_active === false) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact an administrator.',
        });
      }
      req.userRole     = profile.role || 'student';
      req.departmentId = profile.department_id || null;
    } else {
      // Profile row doesn't exist yet (e.g. new OAuth user before first sync)
      // Fall back to user_metadata role with 'student' as the safest default
      req.userRole     = user.user_metadata?.role || 'student';
      req.departmentId = null;
    }

    // Step 3: Attach class scope (classIds) based on role
    // This is used by controllers to enforce assignment-level access
    req.classIds = null; // null = not yet resolved or not applicable

    if (req.userRole === 'teacher') {
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select('class_id')
        .eq('teacher_id', req.userId);
      req.classIds = assignments ? assignments.map(a => a.class_id) : [];

    } else if (req.userRole === 'student') {
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('class_id')
        .eq('student_id', req.userId);
      req.classIds = enrollments ? enrollments.map(e => e.class_id) : [];
    }
    // For 'hod' and 'admin': classIds stays null (scope determined by departmentId / global)

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireRole(...allowedRoles)
 * RBAC middleware generator. Must be used AFTER requireAuth.
 *
 * Usage:
 *   router.get('/admin-only', requireAuth, requireRole('admin'), controller);
 *   router.get('/staff', requireAuth, requireRole('admin', 'hod', 'teacher'), controller);
 *
 * SECURITY: Role comes from req.userRole which was set by requireAuth from public.users.
 *           Never from req.body.role or request parameters.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.userRole) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This resource requires one of the following roles: [${allowedRoles.join(', ')}]. Your role is '${req.userRole}'.`,
      });
    }

    next();
  };
}

/**
 * requireSelf(paramName)
 * Ensures the authenticated user can only access their own resource.
 * Admin role bypasses this check (global access).
 *
 * Usage:
 *   router.get('/users/:userId/profile', requireAuth, requireSelf('userId'), controller);
 *
 * @param {string} paramName - The req.params key containing the target user ID
 */
function requireSelf(paramName = 'userId') {
  return (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // Admin has global access — bypass self-check
    if (req.userRole === 'admin') return next();

    const targetId = req.params[paramName];
    if (targetId && targetId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only access your own resources.',
      });
    }

    next();
  };
}

/**
 * optionalAuth
 * Attaches user identity if a valid token is present; does not reject if missing.
 * Use for public endpoints that show richer content to authenticated users.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user) {
        req.user   = user;
        req.userId = user.id;

        const { data: profile } = await supabase
          .from('users')
          .select('role, department_id')
          .eq('id', user.id)
          .maybeSingle();

        req.userRole     = profile?.role || user.user_metadata?.role || 'student';
        req.departmentId = profile?.department_id || null;
        req.classIds     = null;
      }
    }

    next();
  } catch {
    // Optional auth never blocks the request
    next();
  }
}

module.exports = { requireAuth, requireRole, requireSelf, optionalAuth };
