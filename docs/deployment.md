# Phazon Academic Platform — Cloud Deployment Guide

This guide provides step-by-step instructions to deploy the Phazon Academic Platform across **Vercel** (Frontend), **Render** (Backend API), and **Supabase** (Database & Auth).

---

## 1. Database Setup: Supabase Connection

### Step 1: Create Supabase Project
1. Log in to [Supabase Console](https://supabase.com/dashboard).
2. Click **New Project** and name it `Phazon-Academic-Portal`.
3. Set a strong Database Password and select your nearest Region.

### Step 2: Provision Database Schema & Seed Data
1. Navigate to **SQL Editor** in the Supabase Dashboard.
2. Open `database/schema/schema.sql` from this repository, paste it into the editor, and click **Run**.
3. Open `database/seed/seed_demo_data.sql`, paste it into the editor, and click **Run**.

### Step 3: Copy Supabase API Keys
Go to **Project Settings** → **API** and copy:
- **Project URL**: `https://<ref>.supabase.co`
- **service_role secret**: `eyJhbG...` (Keep private — used by Render Backend)

---

## 2. Backend Deployment: Render (Node.js / Express Gateway)

### Step 1: Create Render Web Service
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository `https://github.com/NagaInbarasan/Education_Managment_Portal`.

### Step 2: Configure Service Settings
- **Name**: `phazon-backend-api`
- **Root Directory**: `backend`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Step 3: Set Environment Variables
In the Render Service **Environment** tab, add:
| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | `https://pivqxudlyfnbhxxxuokk.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `<your_supabase_service_role_key>` |
| `GEMINI_API_KEY` | `<your_gemini_api_key>` |
| `FRONTEND_URL` | `https://your-app.vercel.app` (Add after Vercel deployment) |

Click **Deploy Web Service**. Render will give you a live URL (e.g. `https://phazon-backend-api.onrender.com`).

---

## 3. Frontend Deployment: Vercel

### Step 1: Import GitHub Repo in Vercel
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Select `NagaInbarasan/Education_Managment_Portal`.

### Step 2: Project Configuration
- **Framework Preset**: `Other`
- **Root Directory**: `./` (or `frontend`)
- **Build Command**: Leave empty (Static HTML)
- **Output Directory**: Leave default

Click **Deploy**. Vercel will publish your site to `https://education-managment-portal.vercel.app`.

---

## 4. Post-Deployment Verification

1. Test Backend API health: `https://phazon-backend-api.onrender.com/api/health`
2. Test Frontend in browser: `https://education-managment-portal.vercel.app`
3. Log in with demo accounts (Student / Teacher / HOD / Admin) to confirm complete functionality!
