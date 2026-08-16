# Phazon Academic Platform — Security Architecture & Governance

## Overview
Phazon implements multi-layered defense-in-depth security principles across authentication, authorization, API traffic, and database queries.

---

## Security Layers

### 1. Authentication & Session Management
- **Supabase Auth SDK**: Supports secure email/password and Google OAuth authentication.
- **Authoritative Role Resolution**: Role is verified against `public.users` on every backend request via Bearer JWT verification.

### 2. Authorization (RBAC & Multi-Tenant Isolation)
- **Role-Based Middlewares**: Express router uses `requireAuth`, `requireRole('admin', 'hod', 'teacher', 'student')`, and `scopeGuard`.
- **Row-Level Security (RLS)**: PostgreSQL policies on Supabase tables restrict cross-tenant and cross-department data exposure.

### 3. Helmet Content-Security-Policy (CSP)
- Whitelists only trusted CDNs (`cdn.tailwindcss.com`, `cdn.jsdelivr.net`, `fonts.googleapis.com`, `fonts.gstatic.com`).
- Disables dangerous eval execution and external script injection.

### 4. API Rate Limiting & Input Sanitization
- Global Express rate limiter applied on `/api/*` routes.
- PostgREST search queries and user inputs are strictly sanitized to prevent SQL injection and XSS.

### 5. Audit Logging
- Immutable, append-only logs stored in `public.audit_logs` tracking security events, authentication attempts, and administrative configuration updates.
