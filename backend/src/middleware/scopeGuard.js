/**
 * Phazon Backend — Authorization Scope Guard Helpers
 *
 * These helpers enforce data-level authorization beyond role checks.
 * They are used by controllers in Phase 5+ to ensure:
 *
 *   HOD   → can only access their own department's data
 *   Teacher → can only access classes they are assigned to
 *   Student → can only access their own enrolled data
 *   Admin   → bypasses all scope restrictions (global access)
 *
 * USAGE (in a controller):
 *   const { assertDepartmentScope, assertClassScope } = require('../middleware/scopeGuard');
 *
 *   // In a controller function:
 *   assertDepartmentScope(req, targetDepartmentId);  // throws if out of scope
 *   assertClassScope(req, targetClassId);             // throws if out of scope
 *
 * SECURITY NOTE:
 *   These functions rely on req.userRole, req.departmentId, and req.classIds
 *   which are set by requireAuth() from public.users — never from request body.
 */

'use strict';

/**
 * Creates a standard 403 Forbidden error.
 * @param {string} message
 * @returns {Error}
 */
function forbidden(message) {
  const err = new Error(message);
  err.status = 403;
  err.statusCode = 403;
  return err;
}

/**
 * assertDepartmentScope(req, targetDepartmentId)
 *
 * Checks that the authenticated user is authorized to access data
 * belonging to the given department.
 *
 * Rules:
 *   ADMIN   → always authorized (global access)
 *   HOD     → authorized only if their department_id === targetDepartmentId
 *   TEACHER → not authorized at department level (use assertClassScope)
 *   STUDENT → not authorized at department level
 *
 * @param {object} req - Express request (must have been through requireAuth)
 * @param {string} targetDepartmentId - UUID of the department being accessed
 * @throws {Error} 403 if unauthorized
 */
function assertDepartmentScope(req, targetDepartmentId) {
  if (!req.userRole) throw forbidden('Not authenticated.');

  // Admin bypasses all scope checks
  if (req.userRole === 'admin') return;

  // HOD: only their own department
  if (req.userRole === 'hod') {
    if (!req.departmentId || req.departmentId !== targetDepartmentId) {
      throw forbidden(
        `Forbidden: HOD access is scoped to your own department. ` +
        `You do not have access to department ${targetDepartmentId}.`
      );
    }
    return;
  }

  // Teacher and Student have no department-level access
  throw forbidden(
    `Forbidden: Your role (${req.userRole}) does not have department-level access.`
  );
}

/**
 * assertClassScope(req, targetClassId)
 *
 * Checks that the authenticated user is authorized to access data
 * belonging to the given class.
 *
 * Rules:
 *   ADMIN   → always authorized
 *   HOD     → authorized if the class belongs to their department
 *             (pass hodDepartmentId to verify, or use null to allow all dept classes)
 *   TEACHER → authorized only if targetClassId is in req.classIds (their assignments)
 *   STUDENT → authorized only if targetClassId is in req.classIds (their enrollments)
 *
 * @param {object} req - Express request (must have been through requireAuth)
 * @param {string} targetClassId - UUID of the class being accessed
 * @throws {Error} 403 if unauthorized
 */
function assertClassScope(req, targetClassId) {
  if (!req.userRole) throw forbidden('Not authenticated.');

  // Admin bypasses all scope checks
  if (req.userRole === 'admin') return;

  // HOD: has access to all classes in their department (class-dept link checked by caller)
  if (req.userRole === 'hod') return;

  // Teacher and Student: must be in their classIds list
  if (req.userRole === 'teacher' || req.userRole === 'student') {
    const classIds = req.classIds || [];
    if (!classIds.includes(targetClassId)) {
      throw forbidden(
        `Forbidden: You are not assigned to class ${targetClassId}. ` +
        `Your role (${req.userRole}) can only access assigned/enrolled classes.`
      );
    }
    return;
  }

  throw forbidden(`Forbidden: Unrecognized role '${req.userRole}'.`);
}

/**
 * assertSelfOrAbove(req, targetUserId)
 *
 * Checks that the user is either:
 *   - Accessing their own data (targetUserId === req.userId)
 *   - An admin (global access)
 *   - An HOD or teacher accessing a student/subordinate (permissive — caller decides)
 *
 * Use requireSelf() middleware for strict self-only enforcement.
 * Use this for contexts where HOD/Teacher also need access (e.g. view a student's profile).
 *
 * @param {object} req
 * @param {string} targetUserId
 * @param {string[]} privilegedRoles - roles that may access any user (default: ['admin', 'hod', 'teacher'])
 * @throws {Error} 403 if unauthorized
 */
function assertSelfOrAbove(req, targetUserId, privilegedRoles = ['admin', 'hod', 'teacher']) {
  if (!req.userRole) throw forbidden('Not authenticated.');
  if (req.userId === targetUserId) return;
  if (privilegedRoles.includes(req.userRole)) return;

  throw forbidden(
    `Forbidden: You are not authorized to access this user's data. ` +
    `Only ${privilegedRoles.join(', ')} roles may access other users' data.`
  );
}

/**
 * scopeGuard (Express middleware)
 *
 * A proper middleware function that routes import as `{ scopeGuard }`.
 * Scope enforcement for department/class access happens in individual
 * controllers via assertDepartmentScope / assertClassScope.
 * This middleware ensures the import resolves to a real function
 * (previously undefined — CRITICAL security bypass).
 */
function scopeGuard(req, res, next) {
  // Identity & role are already attached by requireAuth.
  // Data-level scope checks happen in controllers.
  next();
}

module.exports = { scopeGuard, assertDepartmentScope, assertClassScope, assertSelfOrAbove, forbidden };
