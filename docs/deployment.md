# Phazon Academic Platform — Deployment Guide

## Overview
This guide explains how to deploy the Phazon Academic Management Platform in local development and production environments.

---

## Environment Configuration

Copy `.env.example` in `backend/` to `.env`:

```env
# Server
PORT=5000
NODE_ENV=production

# CORS
FRONTEND_URL=http://localhost:5000

# Supabase PostgreSQL
SUPABASE_URL=https://your-supabase-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Gemini AI Assistant
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

---

## Local Installation & Execution

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Provision Database Schema
Execute the SQL schema files located in `database/schema/schema.sql` and `database/seed/seed_demo_data.sql` inside the Supabase SQL editor.

### 3. Seed Demo Data
```bash
npm --prefix backend run seed
```

### 4. Run Server
```bash
npm --prefix backend run dev
```

The Express API and static frontend will be accessible at `http://localhost:5000`.

---

## Production Deployment Checklist

1. Set `NODE_ENV=production` in environment.
2. Configure environment variables securely in hosting provider settings (e.g., Render, Railway, Vercel, AWS).
3. Ensure `SUPABASE_SERVICE_ROLE_KEY` is kept private and never committed to version control.
4. Set CORS `FRONTEND_URL` to match your domain.
5. Confirm SSL/HTTPS is enabled on domain gateway.
