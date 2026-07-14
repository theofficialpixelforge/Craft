-- 002_rls_policies.sql
-- Enable RLS and define all policies per MULTITENANCY.md §3
-- Re-runnable: DROP POLICY IF EXISTS before every CREATE POLICY
-- Run AFTER 001_initial_schema.sql

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlinks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_updates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.databases           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_properties       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_property_values  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_views            ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- SELECT: own profile + profiles of members in the same org(s)
-- UPDATE: own profile only
-- INSERT: handled by the auth trigger (no direct insert policy needed)
-- DELETE: not permitted via app
-- ============================================================
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (
      SELECT m2.user_id
      FROM public.memberships m2
      WHERE m2.status = 'active'
        AND m2.org_id IN (
          SELECT m1.org_id FROM public.memberships m1
          WHERE m1.user_id = auth.uid() AND m1.status = 'active'
        )
    )
  );

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- ORGANIZATIONS
-- SELECT: active member of this org
-- INSERT: any authenticated user (manager creates their org at sign-up)
-- UPDATE: owner only
-- ============================================================
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
CREATE POLICY "organizations_select" ON public.organizations
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
CREATE POLICY "organizations_insert" ON public.organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE USING (owner_user_id = auth.uid());

-- ============================================================
-- MEMBERSHIPS
-- SELECT: own memberships + all memberships in orgs the user belongs to
-- INSERT: managers in that org
-- UPDATE: managers in that org (for role changes, status = 'deactivated')
-- DELETE: managers in that org
-- ============================================================
DROP POLICY IF EXISTS "memberships_select" ON public.memberships;
CREATE POLICY "memberships_select" ON public.memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "memberships_insert" ON public.memberships;
CREATE POLICY "memberships_insert" ON public.memberships
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "memberships_update" ON public.memberships;
CREATE POLICY "memberships_update" ON public.memberships
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "memberships_delete" ON public.memberships;
CREATE POLICY "memberships_delete" ON public.memberships
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
    )
  );

-- ============================================================
-- INVITES
-- SELECT: managers in that org (direct table access)
--   Unauthenticated code lookup → use validate_invite_code() SECURITY DEFINER function
-- INSERT: managers in that org
-- UPDATE: no direct policy — all updates (marking used_at) go via service role
-- DELETE: managers can revoke unused invites only
-- ============================================================
DROP POLICY IF EXISTS "invites_select_manager" ON public.invites;
CREATE POLICY "invites_select_manager" ON public.invites
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "invites_insert" ON public.invites;
CREATE POLICY "invites_insert" ON public.invites
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
    )
    AND created_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "invites_delete" ON public.invites;
CREATE POLICY "invites_delete" ON public.invites
  FOR DELETE USING (
    used_at IS NULL
    AND org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
    )
  );

-- ============================================================
-- DOCUMENTS  — standard org scope (any active member of the org)
-- ============================================================
DROP POLICY IF EXISTS "documents_org_scope" ON public.documents;
CREATE POLICY "documents_org_scope" ON public.documents
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================
-- BLOCKS  — standard org scope
-- ============================================================
DROP POLICY IF EXISTS "blocks_org_scope" ON public.blocks;
CREATE POLICY "blocks_org_scope" ON public.blocks
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================
-- BACKLINKS  — standard org scope
-- ============================================================
DROP POLICY IF EXISTS "backlinks_org_scope" ON public.backlinks;
CREATE POLICY "backlinks_org_scope" ON public.backlinks
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================
-- EMPLOYEES
-- SELECT: any active org member
-- INSERT / UPDATE / DELETE: managers only
-- ============================================================
DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select" ON public.employees
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "employees_insert" ON public.employees;
CREATE POLICY "employees_insert" ON public.employees
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "employees_update" ON public.employees;
CREATE POLICY "employees_update" ON public.employees
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "employees_delete" ON public.employees;
CREATE POLICY "employees_delete" ON public.employees
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
    )
  );

-- ============================================================
-- LEAVE_RECORDS
-- SELECT: any active org member (managers see all; app narrows intern view)
-- INSERT / UPDATE / DELETE: managers only
-- ============================================================
DROP POLICY IF EXISTS "leave_records_select" ON public.leave_records;
CREATE POLICY "leave_records_select" ON public.leave_records
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "leave_records_insert" ON public.leave_records;
CREATE POLICY "leave_records_insert" ON public.leave_records
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "leave_records_update" ON public.leave_records;
CREATE POLICY "leave_records_update" ON public.leave_records
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "leave_records_delete" ON public.leave_records;
CREATE POLICY "leave_records_delete" ON public.leave_records
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
    )
  );

-- ============================================================
-- CALENDAR_EVENTS
-- SELECT: any active org member
-- INSERT: any active org member (creator field must match auth.uid)
-- UPDATE / DELETE: creator or any manager in the org
-- ============================================================
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
CREATE POLICY "calendar_events_select" ON public.calendar_events
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
CREATE POLICY "calendar_events_insert" ON public.calendar_events
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND created_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
CREATE POLICY "calendar_events_update" ON public.calendar_events
  FOR UPDATE USING (
    created_by_user_id = auth.uid()
    OR org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;
CREATE POLICY "calendar_events_delete" ON public.calendar_events
  FOR DELETE USING (
    created_by_user_id = auth.uid()
    OR org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
    )
  );

-- ============================================================
-- DAILY_UPDATES
-- SELECT: any active org member (app narrows intern view to own records)
-- INSERT: active org member; user_id must match auth.uid
-- UPDATE: own record only
-- ============================================================
DROP POLICY IF EXISTS "daily_updates_select" ON public.daily_updates;
CREATE POLICY "daily_updates_select" ON public.daily_updates
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "daily_updates_insert" ON public.daily_updates;
CREATE POLICY "daily_updates_insert" ON public.daily_updates
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "daily_updates_update" ON public.daily_updates;
CREATE POLICY "daily_updates_update" ON public.daily_updates
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- MONTHLY_REPORTS
-- SELECT: any active org member (app narrows intern view to own records)
-- INSERT: active org member; user_id must match auth.uid
-- UPDATE: own record only
-- ============================================================
DROP POLICY IF EXISTS "monthly_reports_select" ON public.monthly_reports;
CREATE POLICY "monthly_reports_select" ON public.monthly_reports
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "monthly_reports_insert" ON public.monthly_reports;
CREATE POLICY "monthly_reports_insert" ON public.monthly_reports
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "monthly_reports_update" ON public.monthly_reports;
CREATE POLICY "monthly_reports_update" ON public.monthly_reports
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- DATABASES / DB_PROPERTIES / DB_PROPERTY_VALUES / DB_VIEWS
-- Standard org scope — Phase 3 will add finer-grained policies if needed
-- ============================================================
DROP POLICY IF EXISTS "databases_org_scope" ON public.databases;
CREATE POLICY "databases_org_scope" ON public.databases
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "db_properties_org_scope" ON public.db_properties;
CREATE POLICY "db_properties_org_scope" ON public.db_properties
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "db_property_values_org_scope" ON public.db_property_values;
CREATE POLICY "db_property_values_org_scope" ON public.db_property_values
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "db_views_org_scope" ON public.db_views;
CREATE POLICY "db_views_org_scope" ON public.db_views
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================
-- MANUAL RLS VERIFICATION QUERIES
-- Run these in the Supabase SQL Editor after applying both files.
--
-- 1. Confirm RLS is enabled on all tables:
--    SELECT tablename, rowsecurity
--    FROM pg_tables
--    WHERE schemaname = 'public'
--    ORDER BY tablename;
--    Expected: rowsecurity = true for all 16 tables
--
-- 2. Test unauthenticated access (should return 0 rows):
--    SET LOCAL role TO anon;
--    SELECT count(*) FROM public.documents;
--    Expected: 0
--
-- 3. Test validate_invite_code function (callable without auth):
--    SELECT * FROM public.validate_invite_code('TESTCODE1');
--    Expected: 0 rows (no invite exists), no permission error
--
-- 4. Cross-org isolation test (run from app, MULTITENANCY.md §9 T7/T8):
--    Sign up two managers, create Org A and Org B, add a document
--    to each. Confirm user A cannot read Org B's documents.
-- ============================================================
