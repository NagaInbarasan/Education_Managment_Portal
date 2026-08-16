# Phazon Academic Platform — Database Layer

## Architecture & Overview
The database layer for Phazon is hosted on **Supabase PostgreSQL** and integrated via PostgREST and the `@supabase/supabase-js` client SDK. 

### Key Design Highlights:
- **UUID Primary Keys**: Every entity uses `uuid_generate_v4()` for distributed ID safety.
- **Row-Level Security (RLS)**: Enforced via PostgreSQL policies to ensure student/teacher/HOD multi-tenant data isolation.
- **Role Scoping**: Enforced via express middleware (`requireAuth`, `requireRole`, `scopeGuard`) in tandem with Supabase user metadata.
- **Audit Logging**: Immutable, append-only logs stored in `public.audit_logs`.

---

## Directory Structure
```
database/
├── migrations/          # Incremental SQL migration scripts
│   └── 01_initial_schema.sql
├── schema/              # Core DDL definitions & RLS policies
│   └── schema.sql
├── seed/                # Sample seed data for development & testing
│   └── seed_demo_data.sql
└── README.md
```

---

## Running Migrations & Seeding Data

To apply schema DDL or seed data using the Supabase SQL Editor or `psql`:

```bash
# 1. Execute Schema Migration
psql -h <SUPABASE_HOST> -U postgres -d postgres -f database/schema/schema.sql

# 2. Execute Demo Data Seeding
psql -h <SUPABASE_HOST> -U postgres -d postgres -f database/seed/seed_demo_data.sql
```

Alternatively, run the Node.js database setup utility in backend:
```bash
npm --prefix backend run seed
```
