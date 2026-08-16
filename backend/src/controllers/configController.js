/**
 * Phazon Backend — Academic System Configuration Controller
 * Read/Write system-wide academic settings (grading rules, attendance thresholds, assignment policies).
 */

'use strict';

const supabase = require('../config/supabase');
const { logAudit } = require('../services/auditService');

/**
 * GET /api/config
 * Get all academic configuration entries.
 */
async function getAllConfigs(req, res, next) {
  try {
    const { data: configs, error } = await supabase
      .from('academic_config')
      .select('*')
      .order('config_key', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, data: configs || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/config/:key
 * Get specific configuration entry by key.
 */
async function getConfigByKey(req, res, next) {
  try {
    const { key } = req.params;
    const { data: config, error } = await supabase
      .from('academic_config')
      .select('*')
      .eq('config_key', key)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    if (!config) {
      return res.status(404).json({ success: false, message: `Configuration key '${key}' not found.` });
    }

    return res.status(200).json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/config/:key
 * Update or create configuration entry (Admin only). Audited.
 */
async function updateConfigByKey(req, res, next) {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    const { userId, userRole } = req;

    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required to update system configuration.' });
    }

    if (value === undefined) {
      return res.status(400).json({ success: false, message: 'Configuration value is required.' });
    }

    const { data: updatedConfig, error } = await supabase
      .from('academic_config')
      .upsert([{
        config_key: key,
        config_value: value,
        description: description || null,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'config_key' })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Log audit event
    logAudit({
      actorId: userId,
      action: 'ACADEMIC_CONFIG_UPDATED',
      entityType: 'config',
      entityId: key,
      metadata: { key, newValue: value },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Configuration '${key}' updated successfully.`,
      data: updatedConfig,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllConfigs,
  getConfigByKey,
  updateConfigByKey,
};
