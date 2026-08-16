# Phazon — Academic Management Platform

Phazon is an enterprise-grade, modern academic management platform designed for universities and higher education institutions. Built with a decoupled 3-tier architecture, it features distinct role-based portals for **Students**, **Teachers/Faculty**, **Heads of Department (HOD)**, and **System Administrators**.

---

## Key Features

- **Multi-Role Portals**: Tailored workflows and dashboards for Student, Teacher, HOD, and Admin.
- **Attendance & Academics**: Comprehensive session recording, threshold tracking (e.g., 75% min requirement), and monthly history logs.
- **Coursework & Assessment**: Assignment publishing, submission tracking, exam scheduling, and semester grade reporting.
- **Department Intelligence & Analytics**: Executive performance analytics, class comparisons, and risk metrics.
- **AI Academic Assistant**: Integrated Google Gemini 2.5 AI assistant for student inquiries and academic insights with anti-prompt injection defenses.
- **Financial & Campus Governance**: Fee structure management, collection dashboards, library borrowings, and support ticket management.
- **Security & Compliance**: Supabase Auth SDK integration, Helmet Content-Security-Policy, API rate limiting, and immutable audit logs.

---

## Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3 (Custom Tokens), Material Symbols
- **Backend API**: Node.js, Express.js API Gateway, Helmet Security, CORS, Morgan
- **Database & Auth**: Supabase PostgreSQL, Supabase Auth (Email + Google OAuth), PostgREST
- **AI Assistant**: Google Gemini 2.5 Flash API (`@google/genai`)

---

## Repository Structure

```
phazon/
│
├── frontend/             # Frontend Single Page Views, Components, CSS & JS
│   ├── pages/            # 61 Role-specific HTML views (Student, Teacher, HOD, Admin)
│   ├── css/              # Design System CSS Variables & Component Layouts
│   ├── js/               # State, Auth Client, API Fetch Wrapper & UI Handlers
│   ├── assets/           # Platform Brand Assets
│   ├── index.html        # Main Landing Entry View
│   └── README.md         # Frontend Documentation
│
├── backend/              # Express API Server Gateway
│   ├── src/
│   │   ├── config/       # Supabase Client & CORS Options
│   │   ├── middleware/   # Auth (requireAuth, requireRole), Rate Limiter, Error Handler
│   │   ├── routes/       # Endpoint Route Handlers
│   │   ├── controllers/  # Core Business Logic Controllers
│   │   ├── services/     # External Integrations (Gemini AI Service)
│   │   ├── utils/        # Logger & Response Helpers
│   │   ├── app.js        # Express Application Setup
│   │   └── server.js     # Server Entry Listener
│   ├── package.json
│   ├── .env.example
│   └── README.md         # Backend Documentation
│
├── database/             # PostgreSQL DDL, Migrations & Seeding
│   ├── migrations/       # Incremental Schema Migrations
│   ├── schema/           # PostgreSQL Schema DDL & RLS Policies
│   ├── seed/             # Development & Demo Data DDL
│   └── README.md         # Database Documentation
│
├── docs/                 # Platform Technical Documentation
│   ├── architecture.md   # System Architecture & Design Overview
│   ├── deployment.md     # Production & Local Deployment Instructions
│   └── security.md       # Security Architecture, RLS & CSP Policies
│
├── .gitignore            # Git Ignored Files (.env, node_modules, test scripts)
├── .env.example          # Environment Variables Template
├── README.md             # Project Root Documentation
└── LICENSE               # MIT License
```

---

## Quickstart & Local Setup

### 1. Prerequisites
- Node.js (v18.0.0 or higher)
- Supabase Project or PostgreSQL Database instance

### 2. Environment Setup
Copy `.env.example` in `backend/` to `.env`:
```bash
cp backend/.env.example backend/.env
```

Fill in your `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optional `GEMINI_API_KEY`.

### 3. Install Dependencies
```bash
cd backend
npm install
```

### 4. Seed Database
```bash
npm --prefix backend run seed
```

### 5. Launch Server
```bash
npm --prefix backend run dev
```

Open `http://localhost:5000` in your web browser.

---

## License

This project is licensed under the [MIT License](LICENSE).
