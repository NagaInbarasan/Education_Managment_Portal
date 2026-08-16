# Phazon Academic Platform — Backend REST API Gateway

## Overview
The Phazon backend is a Node.js / Express.js REST API gateway providing academic management services, authentication integration, role-based authorization, rate limiting, and AI assistance.

---

## Directory Structure
```
backend/
├── src/
│   ├── config/          # Configuration (Supabase client, CORS settings)
│   │   ├── corsOptions.js
│   │   └── supabase.js
│   ├── middleware/      # Express authentication & security middlewares
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   └── rateLimiter.js
│   ├── controllers/     # Route controllers for academic modules
│   ├── routes/          # Express API route modules
│   ├── services/        # External services (Gemini AI client)
│   ├── utils/           # Helper utilities (logger, response helper)
│   ├── scripts/         # Seeding & phase test scripts
│   ├── app.js           # Express application configuration
│   └── server.js        # Server listener entry point
├── package.json
├── .env.example
└── README.md
```

---

## Key API Endpoints

| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | System health check |
| `POST` | `/api/auth/login` | Public | User login endpoint |
| `GET` | `/api/profile` | Authenticated | Fetch current user profile |
| `POST` | `/api/profile` | Authenticated | Sync/update profile details |
| `GET` | `/api/attendance/my` | Student | Fetch student attendance records |
| `POST` | `/api/attendance/session` | Teacher/HOD/Admin | Record class attendance session |
| `GET` | `/api/assignments` | Authenticated | Fetch course assignments |
| `GET` | `/api/analytics/department` | HOD/Admin | Department analytics summary |
| `GET` | `/api/analytics/admin` | Admin | Institution executive analytics |
| `GET` | `/api/config` | Authenticated | Read system configuration thresholds |
| `PUT` | `/api/config/:key` | Admin | Update system configuration threshold |
| `POST` | `/api/ai/academic-assistant` | Authenticated | Academic AI query interface |

---

## Running Locally

```bash
npm install
npm run dev
```
Express server runs on `http://localhost:5000`.
