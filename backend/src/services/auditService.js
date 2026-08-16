/**
 * Phazon Backend — Audit Logging Service
 * Append-only audit trail for security-sensitive operations.
 * Fire-and-forget: never blocks the main request path.
 */

'use strict';

const supabase = require('../config/supabase');

/**
 * Log an auditable action. Fire-and-forget — errors are caught and logged,
 * never propagated to the caller.
 *
 * @param {object} params
 * @param {string} params.actorId      — UUID of the user performing the action
 * @param {string} params.action       — Action identifier (e.g. 'LOGIN', 'GRADE_RECORDED')
 * @param {string} params.entityType   — Type of entity affected (e.g. 'auth', 'grade', 'config')
 * @param {string} [params.entityId]   — ID of the affected entity
 * @param {object} [params.metadata]   — Additional structured data (NEVER include passwords/secrets)
 * @param {string} [params.ipAddress]  — Client IP address
 */
async function logAudit({ actorId, action, entityType, entityId, metadata, ipAddress }) {
  try {
    await supabase.from('audit_logs').insert([{
      actor_id: actorId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata: metadata || {},
      ip_address: ipAddress || null,
    }]);
  } catch (err) {
    // Never let audit failure break the main flow
    console.error('[AuditService] Failed to log audit event:', err.message);
  }
}

/**
 * Query audit logs (admin-only). Supports pagination and filtering.
 */
async function queryAuditLogs({ entityType, action, actorId, dateFrom, dateTo, page = 1, limit = 50 }) {
  const offset = (page - 1) * limit;

  let query = supabase
    .from('audit_logs')
    .select('*, actor:users!audit_logs_actor_id_fkey(name, email, role)', { count: 'exact' });

  if (entityType) query = query.eq('entity_type', entityType);
  if (action) query = query.eq('action', action);
  if (actorId) query = query.eq('actor_id', actorId);
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo);

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    logs: data || [],
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

module.exports = { logAudit, queryAuditLogs };
