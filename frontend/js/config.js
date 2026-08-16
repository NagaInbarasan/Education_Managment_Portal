/**
 * Phazon Frontend — Runtime Configuration
 * ─────────────────────────────────────────────────────────────────
 * Resolves the correct backend API URL depending on the environment.
 *
 * Logic:
 *  - Local dev  (localhost / 127.0.0.1) → `${window.location.origin}/api`
 *  - Production (Vercel) → points to Render backend API endpoint
 */

const PzConfig = (() => {
  // Primary production API URL on Render
  const PROD_API_URL = window.PHAZON_API_URL 
    || 'https://education-managment-portal.onrender.com/api';

  const localHosts = ['localhost', '127.0.0.1'];
  const isLocal = localHosts.includes(window.location.hostname);

  const API_BASE = isLocal
    ? `${window.location.origin}/api`
    : PROD_API_URL;

  return { API_BASE, isLocal };
})();

window.PzConfig = PzConfig;
