# Phazon Academic Platform — Architecture Documentation

## Overview
Phazon is a modern, high-performance academic management platform built with a decoupled 3-tier architecture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND TIER (HTML5 / Vanilla JS / CSS)               │
│   • 61 Static HTML Pages across Student, Teacher, HOD, and Admin Portals     │
│   • Material Design Expressive Tokens + Custom Glassmorphism Styling       │
│   • Client-side State & Auth Controllers (PzState, PzAuth, PzUI)            │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ HTTP / REST APIs (Bearer Token)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BACKEND TIER (Node.js / Express Gateway)               │
│   • Express API Gateway serving `/api` endpoints & static frontend pages   │
│   • Security Middleware: Helmet CSP, CORS, Rate Limiting, Audit Logging    │
│   • Authorization Middleware: requireAuth, requireRole, scopeGuard         │
│   • Integrated Services: Academic AI Assistant, Analytics, Notifications   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ PostgREST + Service Role SDK
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATABASE TIER (Supabase PostgreSQL)                    │
│   • PostgreSQL Database with UUID primary keys & foreign keys              │
│   • Row-Level Security (RLS) Policies on core tables                        │
│   • Multi-Tenant Data Isolation per Department & User Role                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Stack

| Layer | Technologies & Frameworks |
|---|---|
| **Frontend** | HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3 (Custom Design Tokens), Material Symbols |
| **Backend API** | Node.js (v18+), Express.js (v4), Helmet (CSP), CORS, Morgan |
| **Database & Auth** | Supabase (PostgreSQL), Supabase Auth SDK (`@supabase/supabase-js`), PostgREST |
| **AI Integration** | Google Gemini 2.5 Flash API (`@google/genai`) |
| **Testing** | Node Test Runner, Native E2E Assertions, Chrome DevTools MCP |

---

## Role-Based Access Model

- **Student**: Access to personal dashboard, profile, attendance, course assignments, grades, timetable, fees, leave requests, feedback, and AI academic assistant.
- **Teacher**: Access to faculty dashboard, assigned class rosters, mark attendance, post assignments, enter marks, upload resources, and timetable.
- **HOD (Head of Department)**: Access to department dashboard, department-wide analytics, faculty & student oversight, timetable management, and department broadcast alerts.
- **Admin**: Full system governance, academic year & semester configuration, institution-wide executive analytics, security audit logs, rate limiters, and financial management.
