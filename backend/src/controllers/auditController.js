/**
 * Phazon Backend — Audit Log Controller
 * Admin-only endpoint to view security audit logs.
 */

'use strict';

const { queryAuditLogs } = require('../services/auditService');

/**
 * GET /api/audit
 * Query paginated audit logs (Admin only).
 */
async function getAuditLogsController(req, res, next) {
  try {
    const { entity_type, action, actor_id, date_from, date_to, page = 1, limit = 50 } = req.query;

    const result = await queryAuditLogs({
      entityType: entity_type,
      action,
      actorId: actor_id,
      dateFrom: date_from,
      dateTo: date_to,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAuditLogsController,
};
