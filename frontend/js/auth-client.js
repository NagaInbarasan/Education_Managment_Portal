/**
 * Phazon Frontend — Centralized Supabase Auth Client
 * ─────────────────────────────────────────────────────────────────
 * All authentication operations go through Supabase Auth SDK.
 * Supports: Email + Password, Google OAuth, Session Persistence, Role Management.
 *
 * SECURITY NOTE:
 *   After every login, this client fetches the user's canonical role from
 *   GET /api/profile (backed by public.users) — NOT from JWT user_metadata.
 *   This ensures that admin-assigned role changes take effect immediately
 *   without requiring the user to re-register.
 *
 *   requireAuthGuard() is a UX convenience only — it is NOT the security layer.
 *   Backend middleware (requireAuth + requireRole) enforces all real authorization.
 */

const PzAuth = (() => {
  function getApiBase() {
    if (window.PzConfig?.API_BASE) return window.PzConfig.API_BASE;
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return isLocal ? `${window.location.origin}/api` : 'https://education-managment-portal.onrender.com/api';
  }
  const API_BASE = getApiBase();

  let _supabase = null;

  function _getClient() {
    if (!_supabase && window.supabase) {
      try {
        _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession:   true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
      } catch (e) {
        console.warn('[PzAuth] Supabase init error:', e);
      }
    }
    return _supabase;
  }

  function _setSessionData(session) {
    try { localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session)); } catch {}
  }

  function _getSessionData() {
    try {
      const val = localStorage.getItem(AUTH_SESSION_KEY);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  }

  function _clearSessionData() {
    try { localStorage.removeItem(AUTH_SESSION_KEY); } catch {}
  }

  function _formatSession(sbSession) {
    if (!sbSession) return null;
    const meta = sbSession.user?.user_metadata || {};
    return {
      user: {
        id:            sbSession.user.id,
        // NOTE: role from user_metadata is a TEMPORARY FALLBACK only.
        // The authoritative role is fetched from public.users via /api/profile
        // in the _enrichSessionWithProfile() step after every login.
        name:          meta.name || meta.full_name || sbSession.user.email?.split('@')[0] || 'User',
        email:         sbSession.user.email,
        role:          meta.role || 'student',
        department_id: meta.department_id || null,
        avatar_url:    meta.avatar_url || meta.picture || null,
      },
      token:      sbSession.access_token,
      expires_at: sbSession.expires_at * 1000,
    };
  }

  /**
   * Syncs the profile row in public.users (creates it if missing).
   * NOTE: The backend ignores any 'role' in the POST body — role is always
   * preserved from the existing DB row or defaults to 'student'.
   */
  async function _syncProfileToBackend(session) {
    if (!session?.token) return;
    try {
      await fetch(`${API_BASE}/profile`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          name: session.user.name,
          // role is intentionally NOT sent — backend derives it from public.users
        }),
      });
    } catch (_) {}
  }

  /**
   * Fetches the authoritative user profile from the backend and merges
   * the canonical role + department_id into the session object.
   *
   * This is the critical step that ensures admin-assigned role changes
   * are reflected without requiring re-registration.
   *
   * @param {object} session - The formatted session object (with fallback role from metadata)
   * @returns {object} Updated session with role from public.users
   */
  async function _enrichSessionWithProfile(session) {
    if (!session?.token) return session;
    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method:  'GET',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.token}`,
        },
      });
      if (!res.ok) return session;
      const json = await res.json();
      const profile = json?.data;
      if (!profile) return session;

      // Merge authoritative profile data into session
      const enriched = {
        ...session,
        user: {
          ...session.user,
          role:          profile.role          || session.user.role,
          department_id: profile.department_id || session.user.department_id,
          name:          profile.name          || session.user.name,
          is_active:     profile.is_active,
        },
      };
      return enriched;
    } catch (_) {
      // If backend is unavailable, fall back to metadata role
      return session;
    }
  }

  function _syncAppState(session) {
    if (!session?.user || !window.PzState) return;
    PzState.setUser(session.user);
    PzState.setRole(session.user.role || 'student');
    if (session.user.department_id) PzState.setDepartment(session.user.department_id);
  }

  /**
   * Get target dashboard URL based on user role.
   */
  function getDashboardUrl(role) {
    const cleanRole = (role || '').toLowerCase();
    switch (cleanRole) {
      case 'admin':
        return '../admin/dashboard.html';
      case 'hod':
        return '../hod/dashboard.html';
      case 'teacher':
        return '../teacher/dashboard.html';
      case 'student':
      default:
        return '../student/dashboard.html';
    }
  }

  async function register({ name, email, password, role, department_id }) {
    const client = _getClient();
    if (!client) throw new Error('Auth service unavailable.');

    const userName   = (name || email.split('@')[0]).trim();
    const userRole   = ['student', 'teacher', 'hod', 'admin'].includes(role) ? role : 'student';
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name:          userName,
          role:          userRole,
          department_id: department_id || null,
        },
        emailRedirectTo: null,
      },
    });

    if (error) throw new Error(error.message || 'Registration failed.');

    const session = _formatSession(data.session);
    if (session) {
      _setSessionData(session);
      _syncAppState(session);
      _syncProfileToBackend(session).catch(() => {});
    }

    return { session, user: data.user, requiresConfirmation: !data.session, role: userRole };
  }

  async function login({ email, password }) {
    const client = _getClient();
    if (!client) throw new Error('Auth service unavailable.');

    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('Email not confirmed')) {
        throw new Error('Please confirm your email before logging in.');
      }
      if (msg.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password.');
      }
      throw new Error(msg || 'Login failed.');
    }

    if (!data.session) {
      throw new Error('Login failed — no session returned.');
    }

    // Step 1: Format session with JWT metadata as initial (fallback) role
    let session = _formatSession(data.session);

    // Step 2: Ensure profile row exists in public.users
    await _syncProfileToBackend(session).catch(() => {});

    // Step 3: Fetch AUTHORITATIVE role from public.users via backend
    // This overrides the JWT metadata role with the DB-sourced role.
    session = await _enrichSessionWithProfile(session);

    // Step 4: Persist enriched session and sync app state
    _setSessionData(session);
    _syncAppState(session);

    return session;
  }

  async function loginWithGoogle(redirectTo) {
    const client = _getClient();
    if (!client) throw new Error('Auth service unavailable.');

    const redirectUrl = redirectTo || `${window.location.origin}${window.location.pathname}`;

    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    });

    if (error) throw new Error(error.message || 'Google sign-in failed.');
  }

  async function handleOAuthCallback() {
    const client = _getClient();
    if (!client) return null;

    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session) return null;

    let formatted = _formatSession(session);
    await _syncProfileToBackend(formatted).catch(() => {});
    formatted = await _enrichSessionWithProfile(formatted);
    _setSessionData(formatted);
    _syncAppState(formatted);

    return formatted;
  }

  async function getSession() {
    const cached = _getSessionData();
    if (cached && cached.expires_at > Date.now()) {
      _syncAppState(cached);
      return cached;
    }

    const client = _getClient();
    if (!client) return null;

    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) {
        _clearSessionData();
        return null;
      }

      const formatted = _formatSession(session);
      _setSessionData(formatted);
      _syncAppState(formatted);
      return formatted;
    } catch {
      _clearSessionData();
      return null;
    }
  }

  async function logout() {
    const client = _getClient();
    if (client) {
      try { await client.auth.signOut(); } catch (_) {}
    }
    _clearSessionData();
    if (window.PzState) PzState.resetAll();
    window.location.href = '../auth/auth.html';
  }

  function requireAuthGuard(requiredRole) {
    const session = _getSessionData();
    if (!session || session.expires_at <= Date.now()) {
      _clearSessionData();
      window.location.href = `../auth/auth.html?redirect=${encodeURIComponent(window.location.href)}`;
      return false;
    }

    if (requiredRole && session.user?.role !== requiredRole && session.user?.role !== 'admin') {
      window.location.href = getDashboardUrl(session.user?.role);
      return false;
    }

    return true;
  }

  return {
    register,
    login,
    loginWithGoogle,
    handleOAuthCallback,
    getSession,
    logout,
    requireAuthGuard,
    getDashboardUrl,
    // Exposed for testing/debugging only:
    _enrichSessionWithProfile,
  };
})();

window.PzAuth = PzAuth;

// Auto-initialize mobile navigation drawer toggle for tablet and mobile viewports
document.addEventListener('DOMContentLoaded', () => {
  const sidebarNav = document.querySelector('nav');
  const header = document.querySelector('main > div');
  if (sidebarNav && header && !document.getElementById('pz-mobile-toggle')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'pz-mobile-toggle';
    toggleBtn.className = 'md:hidden p-2 text-on-surface-variant hover:text-primary rounded-lg border border-outline-variant mr-3 flex items-center justify-center flex-shrink-0';
    toggleBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">menu</span>';
    toggleBtn.title = 'Toggle Navigation Menu';
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebarNav.classList.toggle('hidden');
      sidebarNav.classList.toggle('fixed');
      sidebarNav.classList.toggle('inset-0');
      sidebarNav.classList.toggle('z-50');
      sidebarNav.classList.toggle('w-64');
      sidebarNav.classList.toggle('shadow-2xl');
    });
    header.prepend(toggleBtn);
  }
});
