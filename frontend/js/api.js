/**
 * Phazon Frontend — Academic Intelligence API Client
 * ─────────────────────────────────────────────────────────────────
 * Centralized client wrapper for communication with the Phazon Express backend API.
 * Authenticated requests automatically attach the Supabase JWT Bearer token.
 */

const PzAPI = (() => {
  function getApiBase() {
    if (window.PzConfig?.API_BASE) return window.PzConfig.API_BASE;
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return isLocal ? `${window.location.origin}/api` : 'https://education-managment-portal.onrender.com/api';
  }
  const BASE_URL = getApiBase();

  // ── Auth Header Helper ───────────────────────────────────────────
  function _getAuthHeadersSync() {
    try {
      const raw = localStorage.getItem('pz_auth_session');
      if (!raw) return {};
      const session = JSON.parse(raw);
      const token = session?.token;
      if (!token || token.startsWith('pz_token_')) return {};
      return { Authorization: `Bearer ${token}` };
    } catch {
      return {};
    }
  }

  // ── Core Fetch Wrapper ───────────────────────────────────────────
  async function request(endpoint, options = {}, withAuth = false) {
    const url = `${BASE_URL}${endpoint}`;
    const defaultHeaders = { 'Content-Type': 'application/json' };
    const authHeaders = withAuth ? _getAuthHeadersSync() : {};

    const config = {
      ...options,
      headers: { ...defaultHeaders, ...authHeaders, ...(options.headers || {}) },
    };

    let response;
    try {
      response = await fetch(url, config);
    } catch (networkErr) {
      console.warn(`[PzAPI] Network error for ${endpoint}:`, networkErr.message);
      throw new Error('NETWORK_ERROR');
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(`HTTP ${response.status} — invalid JSON response`);
    }

    if (!response.ok) {
      if (response.status === 401) throw new Error('UNAUTHORIZED');
      if (response.status === 403) throw new Error('FORBIDDEN');
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data;
  }

  // ── Generic HTTP Methods ──────────────────────────────────────────
  async function get(endpoint) {
    return request(endpoint, { method: 'GET' });
  }

  async function authGet(endpoint) {
    return request(endpoint, { method: 'GET' }, true);
  }

  async function post(endpoint, body = {}) {
    return request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  async function authPost(endpoint, body = {}) {
    return request(endpoint, { method: 'POST', body: JSON.stringify(body) }, true);
  }

  async function authPut(endpoint, body = {}) {
    return request(endpoint, { method: 'PUT', body: JSON.stringify(body) }, true);
  }

  async function authDelete(endpoint) {
    return request(endpoint, { method: 'DELETE' }, true);
  }

  // ── Health ───────────────────────────────────────────────────────
  async function checkHealth()   { return get('/health'); }
  async function checkDbHealth() { return get('/db/health'); }

  // ── Courses ──────────────────────────────────────────────────────
  async function getCourses()      { return get('/courses'); }
  async function getCourseById(id) { return get(`/courses/${id}`); }

  // ── Profile ──────────────────────────────────────────────────────
  async function getProfile() {
    try {
      const res = await authGet('/profile');
      return res?.data || null;
    } catch (err) {
      if (err.message !== 'NETWORK_ERROR' && err.message !== 'UNAUTHORIZED') {
        console.warn('[PzAPI] getProfile failed:', err.message);
      }
      return null;
    }
  }

  // ── Academic Intelligence AI ─────────────────────────────────────
  async function getAcademicInsights() {
    try {
      const res = await authGet('/ai/academic-insights');
      return res?.data || null;
    } catch (err) {
      return null;
    }
  }

  async function generateAcademicInsights(payload = {}) {
    try {
      const res = await authPost('/ai/academic-insights', payload);
      return res?.data || null;
    } catch (err) {
      return null;
    }
  }

  // ── Public API ───────────────────────────────────────────────────
  return {
    checkHealth,
    checkDbHealth,
    getCourses,
    getCourseById,
    getProfile,
    getAcademicInsights,
    generateAcademicInsights,
    get,
    authGet,
    post,
    authPost,
    authPut,
    authDelete,
  };
})();

window.PzAPI = PzAPI;
