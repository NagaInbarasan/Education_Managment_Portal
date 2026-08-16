/**
 * Phazon Backend — Auth Controller
 *
 * Provides backend endpoints for academic user registration, login, and admin user creation using Supabase Auth.
 *
 * Valid Roles:
 *   - student
 *   - teacher
 *   - hod
 *   - admin
 */

'use strict';

const supabase = require('../config/supabase');
const { logAudit } = require('../services/auditService');

const VALID_ROLES = ['student', 'teacher', 'hod', 'admin'];

/**
 * POST /api/auth/register
 */
async function registerUser(req, res, next) {
  try {
    const { name, email, password, role, department_id, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const userName = name || email.split('@')[0];
    const userRole = VALID_ROLES.includes(role) ? role : 'student';
    const cleanEmail = email.trim().toLowerCase();

    // Step 1: Sign up via Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { name: userName, role: userRole },
      },
    });

    if (signUpError) {
      const msg = signUpError.message || '';
      if (msg.includes('already registered') || msg.includes('already exists') || signUpError.status === 422) {
        return res.status(400).json({
          success: false,
          message: 'This email is already registered. Please log in instead.',
        });
      }
      return res.status(400).json({ success: false, message: msg });
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      return res.status(500).json({ success: false, message: 'Failed to create user account.' });
    }

    // Step 2: Auto-confirm email if RPC function available
    await supabase.rpc('confirm_user_email', { p_user_id: userId }).catch(() => {});

    // Step 3: Insert/upsert profile in public.users
    const userProfile = {
      id: userId,
      name: userName,
      email: cleanEmail,
      role: userRole,
      department_id: department_id || null,
      phone: phone || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    await supabase.from('users').upsert([userProfile], { onConflict: 'id' });

    // Step 4: Sign in to get JWT token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (signInError) {
      return res.status(201).json({
        success: true,
        message: 'Account created! Please check your email to confirm your account, then log in.',
        user: { id: userId, name: userName, email: cleanEmail, role: userRole, department_id: userProfile.department_id },
        session: null,
        requires_confirmation: true,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id: userId,
        name: userName,
        email: cleanEmail,
        role: userRole,
        department_id: userProfile.department_id,
      },
      session: {
        access_token: signInData.session.access_token,
        expires_at: signInData.session.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Authenticate via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !authData?.session) {
      if (authError?.message?.includes('Email not confirmed')) {
        return res.status(400).json({
          success: false,
          message: 'Please confirm your email before logging in.',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Fetch full user profile from public.users
    const { data: profile } = await supabase
      .from('users')
      .select('id, name, email, role, department_id, phone, avatar_url, is_active')
      .eq('id', authData.session.user.id)
      .maybeSingle();

    if (profile && profile.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact an administrator.',
      });
    }

    const userMeta = authData.session.user.user_metadata || {};
    const userRole = profile?.role || userMeta.role || 'student';

    logAudit({
      actorId: authData.session.user.id,
      action: 'LOGIN',
      entityType: 'auth',
      entityId: authData.session.user.id,
      metadata: { role: userRole, email: cleanEmail },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: {
        id: authData.session.user.id,
        name: profile?.name || userMeta.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: userRole,
        department_id: profile?.department_id || null,
        phone: profile?.phone || null,
        avatar_url: profile?.avatar_url || null,
      },
      session: {
        access_token: authData.session.access_token,
        expires_at: authData.session.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/create-user (Admin Only)
 * Creates a user directly in auth and public.users with assigned role and department.
 */
async function createUserByAdmin(req, res, next) {
  try {
    const { name, email, password, role, department_id, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    const userRole = VALID_ROLES.includes(role) ? role : 'student';
    const cleanEmail = email.trim().toLowerCase();

    // Create auth user
    const { data: createData, error: createError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { name, role: userRole },
      },
    });

    if (createError) {
      return res.status(400).json({ success: false, message: createError.message });
    }

    const userId = createData.user?.id;

    // Create user profile in public.users
    const { data: newUser, error: profileError } = await supabase
      .from('users')
      .upsert([{
        id: userId,
        name,
        email: cleanEmail,
        role: userRole,
        department_id: department_id || null,
        phone: phone || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'id' })
      .select()
      .single();

    if (profileError) {
      return res.status(500).json({ success: false, message: profileError.message });
    }

    logAudit({
      actorId: req.userId,
      action: 'USER_CREATED_BY_ADMIN',
      entityType: 'user',
      entityId: userId,
      metadata: { createdRole: userRole, createdEmail: cleanEmail, name },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `User created successfully as ${userRole}.`,
      data: newUser,
    });

  } catch (err) {
    next(err);
  }
}

module.exports = { registerUser, loginUser, createUserByAdmin };
