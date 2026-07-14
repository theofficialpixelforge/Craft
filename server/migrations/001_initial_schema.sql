-- 001_initial_schema.sql
-- Phase 7 Postgres schema — all tables for the multi-tenant app
-- Re-runnable: every CREATE TABLE/INDEX uses IF NOT EXISTS
-- Run via: node server/scripts/run_migrations.js
-- Or paste into: Supabase Dashboard → SQL Editor

-- ============================================================
-- 1. PROFILES  (bridge between auth.users and app data)
--    One row per Supabase Auth user; auto-created by trigger below.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-insert a profiles row when a new auth.users row is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  owner_user_id UUID        NOT NULL REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. MEMBERSHIPS  (many-to-many users ↔ orgs; v1 is one org per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.memberships (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id),
  org_id     UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('manager', 'intern')),
  status     TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, org_id)
);

-- ============================================================
-- 4. EMPLOYEES  (org roster; may exist before a user account)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id           UUID        REFERENCES public.profiles(id),
  name              TEXT        NOT NULL,
  email             TEXT,
  job_title         TEXT,
  department        TEXT,
  start_date        DATE,
  employment_type   TEXT        CHECK (employment_type IN ('intern', 'full-time', 'contractor')),
  app_role          TEXT        CHECK (app_role IN ('manager', 'intern')),
  phone             TEXT,
  address           TEXT,
  emergency_contact JSONB,
  status            TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique index: one employee per email per org (allows NULL emails)
-- Used for dedup during localStorage migration
CREATE UNIQUE INDEX IF NOT EXISTS employees_org_email_unique
  ON public.employees (org_id, lower(email))
  WHERE email IS NOT NULL;

-- ============================================================
-- 5. INVITES  (8-char uppercase codes; 7-day expiry)
--    employee_id links an invite to a pre-existing employee row
--    so the profile → employee link can be set at sign-up time.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invites (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code               TEXT        NOT NULL UNIQUE,
  role               TEXT        NOT NULL CHECK (role IN ('manager', 'intern')),
  created_by_user_id UUID        NOT NULL REFERENCES public.profiles(id),
  expires_at         TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at            TIMESTAMPTZ,
  used_by_user_id    UUID        REFERENCES public.profiles(id),
  employee_id        UUID        REFERENCES public.employees(id)
);

-- SECURITY DEFINER function: lets unauthenticated callers look up an invite
-- by its code without bypassing any table-level RLS.
-- Returns the minimal fields the sign-up page needs.
CREATE OR REPLACE FUNCTION public.validate_invite_code(invite_code TEXT)
RETURNS TABLE (
  id          UUID,
  org_id      UUID,
  role        TEXT,
  expires_at  TIMESTAMPTZ,
  used_at     TIMESTAMPTZ,
  employee_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.org_id,
    i.role,
    i.expires_at,
    i.used_at,
    i.employee_id
  FROM public.invites i
  WHERE i.code = invite_code;
END;
$$;

-- ============================================================
-- 6. DOCUMENTS  (migrated from sql.js; Phase 3 columns included
--    so no ALTER TABLE is needed when Phase 3 ships)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID        PRIMARY KEY,
  org_id      UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id   UUID        REFERENCES public.documents(id),
  title       TEXT        NOT NULL DEFAULT 'Untitled',
  emoji       TEXT,
  cover_url   TEXT,
  position    NUMERIC     NOT NULL DEFAULT 0,
  is_favorite BOOLEAN     NOT NULL DEFAULT false,
  is_deleted  BOOLEAN     NOT NULL DEFAULT false,
  -- Phase 3 columns: doc_type distinguishes pages from database containers / DB rows
  doc_type    TEXT        NOT NULL DEFAULT 'page',
  database_id UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. BLOCKS  (includes all additive migration columns from sql.js)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blocks (
  id            UUID        PRIMARY KEY,
  org_id        UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id   UUID        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL,
  content       JSONB       NOT NULL DEFAULT '[]',
  indent        INTEGER     NOT NULL DEFAULT 0,
  position      NUMERIC     NOT NULL DEFAULT 0,
  checked       BOOLEAN,
  language      TEXT,
  callout_icon  TEXT,
  image_url     TEXT,
  image_caption TEXT,
  linked_doc_id UUID        REFERENCES public.documents(id),
  table_data    JSONB,
  columns_data  JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. BACKLINKS  (migrated from sql.js)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.backlinks (
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_doc_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  target_doc_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  PRIMARY KEY (source_doc_id, target_doc_id)
);

-- ============================================================
-- 9. LEAVE_RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leave_records (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('annual', 'sick', 'family', 'overtime')),
  days        NUMERIC,
  hours       NUMERIC,
  date        DATE        NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. CALENDAR_EVENTS
--     import_hash: SHA-256 of (title, start_date, end_date, created_by)
--     used during localStorage migration for idempotent re-runs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID        NOT NULL REFERENCES public.profiles(id),
  title              TEXT        NOT NULL,
  purpose            TEXT,
  attendees          JSONB       NOT NULL DEFAULT '[]',
  start_date         DATE        NOT NULL,
  end_date           DATE        NOT NULL,
  start_time         TIME,
  end_time           TIME,
  color              TEXT,
  is_busy            BOOLEAN     NOT NULL DEFAULT false,
  import_hash        TEXT        UNIQUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. DAILY_UPDATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_updates (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id),
  content    JSONB       NOT NULL DEFAULT '{}',
  date       DATE        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id, date)
);

-- ============================================================
-- 12. MONTHLY_REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id),
  content    JSONB       NOT NULL DEFAULT '{}',
  month      INTEGER     NOT NULL CHECK (month BETWEEN 1 AND 12),
  year       INTEGER     NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id, month, year)
);

-- ============================================================
-- 13. DATABASES  (Phase 3+; created now so Phase 3 has no DDL migrations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.databases (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id UUID        REFERENCES public.documents(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT 'Untitled',
  icon        TEXT,
  cover_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Now that databases exists, add the FK from documents.database_id
-- (self-referential within the schema; done here instead of inline above
-- because databases is defined after documents)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'documents_database_id_fkey'
      AND table_name = 'documents'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_database_id_fkey
      FOREIGN KEY (database_id) REFERENCES public.databases(id);
  END IF;
END;
$$;

-- ============================================================
-- 14. DB_PROPERTIES  (Phase 3+)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.db_properties (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  database_id UUID        NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL,
  config      JSONB       NOT NULL DEFAULT '{}',
  position    NUMERIC     NOT NULL DEFAULT 0,
  is_primary  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique index: exactly one primary property per database
-- (SQLite couldn't enforce this natively; Postgres can)
CREATE UNIQUE INDEX IF NOT EXISTS db_properties_one_primary_per_db
  ON public.db_properties (database_id)
  WHERE is_primary = true;

-- ============================================================
-- 15. DB_PROPERTY_VALUES  (Phase 3+)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.db_property_values (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id UUID        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  property_id UUID        NOT NULL REFERENCES public.db_properties(id) ON DELETE CASCADE,
  value       JSONB       DEFAULT 'null'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, property_id)
);

-- ============================================================
-- 16. DB_VIEWS  (Phase 3+)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.db_views (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  database_id UUID        NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT 'Default View',
  type        TEXT        NOT NULL DEFAULT 'table',
  config      JSONB       NOT NULL DEFAULT '{}',
  position    NUMERIC     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
