/**
 * Phazon Frontend — Runtime Configuration
 * ─────────────────────────────────────────────────────────────────
 * Resolves the correct backend API URL depending on the environment.
 *
 * Logic:
 *  - Local dev  (localhost / 127.0.0.1:5000) → same origin /api (Express serves both)
 *  - Vercel production → points to the Render backend service
 *
 * To update the production backend URL, change PROD_API_URL below.
 */

const PzConfig = (() => {
  const PROD_API_URL = 'https://education-managment-portal.onrender.com/api';

  const localHosts = ['localhost', '127.0.0.1'];
  const isLocal = localHosts.includes(window.location.hostname);

  const API_BASE = isLocal
    ? `${window.location.origin}/api`
    : PROD_API_URL;

  return { API_BASE, isLocal };
})();

window.PzConfig = PzConfig;
