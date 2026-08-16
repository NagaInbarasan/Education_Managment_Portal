/**
 * Phazon Backend — Database Health Controller
 *
 * GET /api/db/health
 * Verifies that the Express backend can communicate with Supabase PostgreSQL.
 */

'use strict';

const supabase = require('../config/supabase');

async function getDbHealth(req, res, next) {
  try {
    // Perform a lightweight query on the skills table to verify connectivity
    const { data, error } = await supabase.from('skills').select('id').limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        message: `Database error: ${error.message}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
      rowCount: data ? data.length : 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDbHealth };
