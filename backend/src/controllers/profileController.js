/**
 * Phazon Backend — Profile Controller
 *
 * GET  /api/profile   - Get the authenticated user's full academic profile
 * POST /api/profile   - Upsert profile (called after OAuth or email signup)
 *
 * SECURITY NOTE:
 *   User identity comes exclusively from req.userId (verified Supabase JWT).
 *   The role is NEVER accepted from req.body — it is always read from public.users.
 *   This ensures role changes made by admins take effect without re-registration.
 */

'use strict';

const supabase = require('../config/supabase');

/**
 * GET /api/profile
 * Returns the full academic profile for the authenticated user.
 */
async function getProfile(req, res, next) {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('id, name, email, role, department_id, phone, avatar_url, is_active, created_at, updated_at')
      .eq('id', req.userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    if (profile.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact an administrator.',
      });
    }

    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/profile
 * Upserts the user profile into public.users.
 * Called after OAuth login or email signup to persist name.
 *
 * SECURITY: Role is NEVER taken from req.body.
 *   - If a profile row already exists, the role is preserved.
 *   - If this is a new user (no row yet), role defaults to 'student'.
 *   - Only an admin using POST /api/auth/create-user can assign non-student roles.
 *
 * Body: { name? }
 */
async function upsertProfile(req, res, next) {
  try {
    const userRecord = req.user;
    const meta = userRecord?.user_metadata || {};

    const name = (req.body?.name || meta.name || meta.full_name || '').trim()
      || userRecord.email?.split('@')[0]
      || 'User';

    const email = userRecord.email || '';

    // Check if profile already exists — preserve existing role
    const { data: existing } = await supabase
      .from('users')
      .select('id, role, department_id')
      .eq('id', req.userId)
      .maybeSingle();

    // If row exists: update name/email only (preserve role).
    // If row is new: default role to 'student'.
    const roleToUse = existing?.role || 'student';

    const { data, error } = await supabase
      .from('users')
      .upsert([{
        id:            req.userId,
        name,
        email,
        role:          roleToUse,
        department_id: existing?.department_id || null,
        is_active:     true,
        updated_at:    new Date().toISOString(),
      }], { onConflict: 'id' })
      .select('id, name, email, role, department_id, is_active')
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, upsertProfile };
