# MULTITENANCY.md — Phase 7 Planning

Multi-tenancy + Postgres migration. This document is the authoritative planning
artefact for Phase 7. No application code, SQL, or schema changes are part of
this document — those happen in Session 2 (implementation). Future sessions
execute against this plan.

---

## 0. Locked decisions — do not relitigate

These five decisions are final. They are recorded here so every future session
starts from the same ground truth.

| # | Decision |
|---|----------|
| 1 | Multi-tenancy AND Postgres migration happen in the same phase. Application-only scoping on sql.js is unacceptable for a B2B product. RLS at the database layer is non-negotiable. |
| 2 | Invite flow uses invite codes for v1. No email infrastructure. Email-link invites are a post-v1 upgrade. |
| 3 | One organization per user for v1. The schema is many-to-many (memberships table) so multi-org UI can be added later as a feature, but every v1 screen assumes a single org. No org-switcher in the header. |
| 4 | Managers create their org explicitly on first sign-up ("create your organization" screen). Interns never see this — they enter via invite code and land in the inviting org. |
| 5 | The sign-in role picker is removed. Role is derived from the user's membership record. Managers get manager role by creating their org; interns get the role set on the invite. |

---

## 1. Target schema

### 1.1 New tables

#### `organizations`
One record per organization (a manager's team/company).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| name | TEXT NOT NULL | Org display name; provided by manager at creation |
| owner_user_id | UUID NOT NULL | FK → profiles.id; the manager who created this org |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT NOW() |

Add `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` — needed because org rename
is in scope for Session 2 (single editable field; non-empty validation only;
PATCH /api/organizations/:id; no rename history).

#### `memberships`
One record per (user × org) pair. Schema is many-to-many; v1 application code
enforces one org per user.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| user_id | UUID NOT NULL | FK → profiles.id |
| org_id | UUID NOT NULL | FK → organizations.id |
| role | TEXT NOT NULL | `'manager'` or `'intern'` |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT NOW() |

UNIQUE constraint on `(user_id, org_id)`.

#### `invites`
One record per invite code issued by a manager.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| org_id | UUID NOT NULL | FK → organizations.id |
| code | TEXT NOT NULL UNIQUE | 8-char alphanumeric; uppercase; generated with crypto.randomBytes |
| role | TEXT NOT NULL | `'manager'` or `'intern'` — the role the invitee will receive |
| created_by_user_id | UUID NOT NULL | FK → profiles.id; must be a manager in this org |
| expires_at | TIMESTAMPTZ NOT NULL | DEFAULT NOW() + 7 days |
| used_at | TIMESTAMPTZ | NULL until redeemed |
| used_by_user_id | UUID | NULL until redeemed; FK → profiles.id |
| employee_id | UUID | NULL; FK → employees.id; set when the invite is generated from an employee profile; links the invitee's user account directly to that employee record on acceptance — no name-matching needed |

A used invite is never deleted — the audit trail stays.

### 1.2 `profiles` table (bridge between Supabase Auth and app data)

Supabase Auth manages `auth.users` internally. Our public schema holds a
`profiles` table that the application reads directly.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | = auth.users.id (ON DELETE CASCADE) |
| name | TEXT NOT NULL | Display name; set at signup |
| email | TEXT NOT NULL | Mirrors auth.users.email |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT NOW() |

A Postgres trigger auto-inserts a `profiles` row whenever `auth.users` gets a
new row. The trigger fires server-side; the app never manually inserts profiles.

`profiles` does **not** have `org_id` — a user's org affiliation lives in
`memberships`, keeping the schema correct for future multi-org support.

### 1.3 Existing sql.js tables — org_id additions

Every domain table gets `org_id UUID NOT NULL REFERENCES organizations(id)`.
This is denormalized (child tables carry org_id even though they have a FK to
a parent that also has org_id) intentionally: denormalization makes RLS
policies trivial (no joins in the policy expression) and queries predictable.

| Table | Current home | Change |
|-------|-------------|--------|
| `documents` | sql.js | Add `org_id` |
| `blocks` | sql.js | Add `org_id` |
| `backlinks` | sql.js | Add `org_id` |

### 1.4 New server-side tables (currently localStorage-only)

These features exist today but are stored in the browser's localStorage. For
multi-tenancy to work — a manager's records visible to interns in the same org
— this data must live on the server. Phase 7 moves it to Postgres.

#### `employees`
The Leave Tracker's employee roster. Currently `leave_employees` in localStorage.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| org_id | UUID NOT NULL | FK → organizations.id |
| user_id | UUID | FK → profiles.id; NULL if the employee has no login yet |
| name | TEXT NOT NULL | |
| email | TEXT | |
| job_title | TEXT | |
| department | TEXT | |
| start_date | DATE | |
| employment_type | TEXT | `'intern'` / `'full-time'` / `'contractor'` |
| app_role | TEXT | `'manager'` / `'intern'` — the role this employee gets when invited |
| phone | TEXT | |
| address | TEXT | |
| emergency_contact | TEXT | JSON: `{ name, phone, relationship }` |
| status | TEXT NOT NULL | `'active'` / `'inactive'` DEFAULT `'active'` |
| notes | TEXT | Manager-only notes; plain text |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT NOW() |

`user_id` is nullable because a manager can add an employee to the roster
before that employee has created an account. On invite acceptance, the link is
established in this priority order:

1. **Direct link (preferred):** if the invite carries `employee_id` (generated
   from an employee profile) → set `employees.user_id = invitee.id` immediately.
   No name or email matching needed.
2. **Email fallback:** if `invite.employee_id` is null → match `employees.email`
   against `auth.users.email` (case-insensitive). If exactly one match is found,
   set `employees.user_id`. If zero or multiple matches are found, leave
   `user_id` null and flag the unresolved link in the session state so the
   manager can resolve it manually from the employee profile page.

#### `leave_records`
Leave and overtime entries recorded by managers.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| org_id | UUID NOT NULL | FK → organizations.id |
| employee_id | UUID NOT NULL | FK → employees.id |
| type | TEXT NOT NULL | `'annual'` / `'sick'` / `'family'` / `'overtime'` |
| days | NUMERIC | Days taken (leave); null for overtime |
| hours | NUMERIC | Hours worked (overtime); null for leave |
| date | DATE NOT NULL | |
| reason | TEXT | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT NOW() |

#### `calendar_events`
Multi-day event bookings. Currently in localStorage.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| org_id | UUID NOT NULL | FK → organizations.id |
| created_by_user_id | UUID NOT NULL | FK → profiles.id |
| title | TEXT NOT NULL | |
| purpose | TEXT | |
| attendees | JSONB NOT NULL | Array of strings DEFAULT '[]' |
| start_date | DATE NOT NULL | |
| end_date | DATE NOT NULL | |
| start_time | TIME | NULL if all-day |
| end_time | TIME | NULL if all-day |
| color | TEXT | Hex colour string |
| is_busy | BOOLEAN NOT NULL | DEFAULT false |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT NOW() |

#### `daily_updates`
Per-user daily entries.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| org_id | UUID NOT NULL | FK → organizations.id |
| user_id | UUID NOT NULL | FK → profiles.id |
| content | JSONB NOT NULL | Serialized update content DEFAULT '{}' |
| date | DATE NOT NULL | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT NOW() |

UNIQUE constraint on `(org_id, user_id, date)`.

#### `monthly_reports`
Per-user monthly report entries.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| org_id | UUID NOT NULL | FK → organizations.id |
| user_id | UUID NOT NULL | FK → profiles.id |
| content | JSONB NOT NULL | DEFAULT '{}' |
| month | INTEGER NOT NULL | 1–12 |
| year | INTEGER NOT NULL | |
| created_at | TIMESTAMPTZ NOT NULL | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ NOT NULL | DEFAULT NOW() |

UNIQUE constraint on `(org_id, user_id, month, year)`.

### 1.5 Phase 3 tables — org_id from the start

Phases 3–6 have not been implemented yet. Since Phase 7 runs first, these
tables will be created directly in Postgres with `org_id` from day one. The
SQLite DDL in `docs/DATABASES.md` is a design reference only; when Phase 3
is implemented, it targets Postgres (see §2.2 for type mapping). No migration
needed for these tables.

| Table | org_id needed |
|-------|--------------|
| `databases` | Yes — add `org_id UUID NOT NULL` from the start |
| `db_properties` | Yes — denormalized from `databases` |
| `db_property_values` | Yes — denormalized from `documents` |
| `db_views` | Yes — denormalized from `databases` |

The `is_primary` constraint in `db_properties` (DATABASES.md §2a) was noted as
"enforced at application layer because SQLite's partial unique indexes are
limited." In Postgres, a real partial unique index works:
`CREATE UNIQUE INDEX ... ON db_properties(database_id) WHERE is_primary = true`.
Phase 3 should use this instead of application-layer enforcement.

### 1.6 Phase 8 table — alignment note

`docs/NOTION_IMPORT.md` §4 already assumes `org_id` exists and references a
table called `orgs`. **Conflict:** Phase 7 uses `organizations`. When Phase 8
is implemented, the `import_jobs` table's `REFERENCES orgs(id)` must be
`REFERENCES organizations(id)`. Note this for Session 2; do not edit
NOTION_IMPORT.md yet. The `import_jobs` SQLite DDL in NOTION_IMPORT.md also
needs Postgres types (see §2.2).

### 1.7 Full table inventory

| Table | Schema home | Phase introduced | org_id | Notes |
|-------|-------------|-----------------|--------|-------|
| `auth.users` | Supabase-managed | 7 | — | Managed by Supabase Auth; not in public schema |
| `profiles` | public | 7 | No | User-level; org affiliation is in memberships |
| `organizations` | public | 7 | Self | The org record IS the org |
| `memberships` | public | 7 | Yes | Junction between profiles and organizations |
| `invites` | public | 7 | Yes | Invite codes issued per org |
| `documents` | public | 1→7 | Yes | Migrated from sql.js |
| `blocks` | public | 1→7 | Yes | Migrated from sql.js |
| `backlinks` | public | 1→7 | Yes | Migrated from sql.js |
| `employees` | public | 7 | Yes | Migrated from localStorage |
| `leave_records` | public | 7 | Yes | Migrated from localStorage |
| `calendar_events` | public | 7 | Yes | Migrated from localStorage |
| `daily_updates` | public | 7 | Yes | Migrated from localStorage |
| `monthly_reports` | public | 7 | Yes | Migrated from localStorage |
| `databases` | public | 3 (post-7) | Yes | Created in Postgres directly |
| `db_properties` | public | 3 (post-7) | Yes | Created in Postgres directly |
| `db_property_values` | public | 3 (post-7) | Yes | Created in Postgres directly |
| `db_views` | public | 3 (post-7) | Yes | Created in Postgres directly |
| `import_jobs` | public | 8 (post-7) | Yes | References `organizations`, not `orgs` |

---

## 2. Postgres migration plan

### 2.1 Target: Supabase Postgres

Supabase provides a managed Postgres instance with:
- Built-in auth (Supabase Auth — `auth.users`, JWT issuance, session management)
- Row Level Security (RLS) enforced at the database layer
- Supabase JS client (`@supabase/supabase-js`) for both frontend and backend
- The PostgREST auto-generated REST API (optional; we keep Express)
- `gen_random_uuid()` built in (no extension needed for UUID generation)

The Express server connects to Supabase Postgres via the standard Postgres
connection string (using `pg` or Supabase client) using the **service role
key** for admin operations and the **user's JWT** for user-context operations
(so RLS is enforced). See §5.1 for the routing strategy.

**Supabase tier:** Start on the **free tier** for development and initial
deployment. The free tier has a 500 MB database limit and pauses the project
after 1 week of inactivity (a keep-alive ping or a scheduled function can
prevent this if needed).
**Upgrade trigger:** move to Pro ($25/month) when the first real (non-developer)
client org is onboarded. Do not wait until the free tier becomes a problem —
set a reminder at onboarding time and upgrade proactively.

### 2.2 Type mapping: sql.js → Postgres

| sql.js / SQLite type | Postgres type | Notes |
|---------------------|--------------|-------|
| `TEXT PRIMARY KEY` (UUID stored as string) | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | Use native UUID type |
| `TEXT NOT NULL` | `TEXT NOT NULL` | Direct |
| `TEXT` (nullable) | `TEXT` | Direct |
| `INTEGER` | `INTEGER` | Direct (use `BOOLEAN` for 0/1 flags like `is_primary`) |
| `REAL` | `FLOAT8` (or `NUMERIC`) | Use NUMERIC for position/order columns |
| `TEXT DEFAULT '{}'` (JSON stored as text) | `JSONB NOT NULL DEFAULT '{}'` | JSONB gives indexing, operators, and validation |
| `TEXT DEFAULT '[]'` (JSON array) | `JSONB NOT NULL DEFAULT '[]'` | Same |
| `TEXT NOT NULL DEFAULT (datetime('now'))` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | TIMESTAMPTZ stores timezone; prevents ambiguity |
| `TEXT` (datetime stored as string) | `TIMESTAMPTZ` | All datetime columns convert |
| `INTEGER NOT NULL DEFAULT 0` (boolean 0/1) | `BOOLEAN NOT NULL DEFAULT false` | `is_primary`, `is_busy`, etc. |
| `ON DELETE CASCADE` | `ON DELETE CASCADE` | Same keyword; Postgres enforces it more reliably |
| FK references (string IDs) | FK references (UUID) | Type changes when ID columns change |

**Key flags:**
- All IDs are TEXT (UUID strings) in sql.js. In Postgres, use `UUID` type —
  better indexing, type safety, and rejects invalid UUIDs.
- All `content TEXT DEFAULT 'null'` columns (db_property_values) become
  `JSONB DEFAULT 'null'::jsonb`. The `UNIQUE (document_id, property_id)`
  constraint translates directly.
- `created_at TEXT` columns storing ISO strings become `TIMESTAMPTZ`. During
  migration, cast via `TO_TIMESTAMP(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`.
- The `datetime('now')` default is SQLite-specific; Postgres uses `NOW()`.
- The `REFERENCES databases(id)` in db_property_values must change to
  `REFERENCES databases(id)` (same name) but with UUID type.

### 2.3 Migrating sql.js data (documents, blocks, backlinks)

**Step 1 — Export.** Before deploying any new code, export the current
`server/db/craft.db` sql.js file. The export script reads the SQLite file
and dumps rows for `documents`, `blocks`, and `backlinks` as a JSON file
(e.g. `migration_export.json`). This is a one-time script run on the
developer's machine.

**Step 2 — Transform.** The migration script transforms the exported JSON:
- Cast all ID columns to UUID-compatible strings (they are already UUIDs,
  so no change — just confirm format).
- Cast all `created_at` / `updated_at` TEXT timestamps to ISO 8601 strings
  (they should already be).
- Add `org_id` = the default org's UUID (created in §2.5) to every row.
- Convert any JSON-as-text columns to valid JSON objects.

**Step 3 — Insert.** The migration script inserts the transformed rows into
the Supabase Postgres tables using the service role key (bypasses RLS). Use
batched inserts (e.g. 100 rows at a time) to avoid timeouts.

**Step 4 — Verify.** After insertion, run row counts: confirm
`documents`, `blocks`, and `backlinks` have the same count in Postgres as
in sql.js.

### 2.4 Migrating localStorage data (employees, leave, calendar, etc.)

localStorage data lives in the manager's browser. It cannot be read
server-side. The migration requires a browser-side export step.

**Approach: automatic `/migrate` route on first post-migration sign-in.**

On every sign-in, the app checks two conditions:
1. Any of the old data localStorage keys are present and non-empty.
2. The user's org has zero rows in the corresponding Postgres tables (checked
   via a lightweight `GET /api/organizations/current/migration-status` endpoint
   that returns counts for each migratable table).

If both conditions are true, the app routes to `/migrate` instead of the home
route. The `/migrate` page reads the localStorage keys, packages them as JSON,
and POSTs to `POST /api/migrate/localStorage` (auth required; service role
write on the backend). After a successful response, the page clears the
relevant localStorage keys and redirects to the home route. On subsequent
sign-ins, condition 1 is false (keys are cleared) and the route is bypassed.

**localStorage keys read during migration:**
- `leave_employees` → `employees` rows + `leave_records` rows
- Calendar events key (TBD — verify key name in Session 2 against the client source)
- Daily updates key (TBD — verify)
- Monthly reports key (TBD — verify)

**Three implementation requirements:**

**1. Idempotency.** Re-POSTing the same export (e.g. if the page is refreshed
mid-migration) must not create duplicate records. Use `INSERT ... ON CONFLICT
DO NOTHING` with a unique index per table's natural key:

| Table | Natural dedup key | Unique index |
|-------|------------------|--------------|
| `employees` | `(org_id, lower(email))` | Requires email to be non-null |
| `leave_records` | `(org_id, employee_id, type, date)` | Added before migration |
| `calendar_events` | SHA-256 hash of `(title, start_date, end_date, created_by)` stored in a `import_hash TEXT` column | Added before migration |
| `daily_updates` | `(org_id, user_id, date)` | Already a UNIQUE constraint |
| `monthly_reports` | `(org_id, user_id, month, year)` | Already a UNIQUE constraint |

For `employees` with null email: use `(org_id, lower(name))` as the fallback
dedup key. Confirm uniqueness in the migration report if names collide.

**2. Employee auto-create for unmatched names.** A leave record may reference
an employee name that does not exist as a pre-created `employees` row (e.g., a
person tracked historically who was never added to the new Postgres roster). In
this case: auto-create a minimal `employees` row with `name` and `org_id` set;
all other fields null; `status = 'active'`. Proceed with importing the leave
records linked to this auto-created row. Surface every auto-created employee in
the migration report so the manager can fill in missing details (email, role,
etc.) afterward. No leave history is silently dropped.

**3. localStorage cleanup on success.** The `/migrate` page clears all migrated
localStorage keys only after the server returns a success response. If the
request fails, the keys are preserved and the user can retry. On success, the
user is redirected to the app home. On the next sign-in, condition 1 (localStorage
data present) is false and `/migrate` is not triggered again.

**Skip option.** A "Skip for now" link is available on `/migrate`. If skipped,
the localStorage data is preserved and the app routes the user to `/migrate`
again on the next sign-in (condition 1 still true). The user can also navigate
to `/migrate` manually at any time via a Settings → Migration link (visible
until migration is complete, then hidden).

**Removal.** The `POST /api/migrate/localStorage` endpoint and the `/migrate`
route are removed once the migration is confirmed complete. Document the removal
in the Session 2 checklist.

### 2.5 Default organization approach

The sql.js database has no org concept. Existing rows must be assigned to
an organization.

**Procedure:**
1. At migration time, create one organization: `{ name: "Default Organization",
   owner_user_id: <first_manager_uid> }`.
2. The owner is the first manager account to complete Supabase Auth sign-up
   during migration. If the developer is the manager, they complete their
   own account first.
3. Set `org_id` on every migrated row (documents, blocks, backlinks,
   and localStorage-migrated rows) to this org's UUID.
4. Create a `memberships` row for the manager:
   `{ user_id: <manager_uid>, org_id: <default_org_id>, role: 'manager' }`.
5. The manager can rename the org from its default name ("Default Organization")
   via the Organization Settings page once the app is running.

**Fallback rule if no manager account exists at migration time:** The
developer creates the organization manually via a seed script or the
Supabase dashboard, then creates their account, then links it as owner.
There is no algorithmic fallback needed — the developer is present.

### 2.6 Cutover plan

**Approach: one-shot migration with planned downtime.**

**Reasoning:** This is a single-developer, pre-revenue application. The only
"user" at migration time is the developer. A staged (blue-green or rolling)
migration would require running two database backends simultaneously, which
adds complexity for no benefit when there is one user and zero paying clients.
One-shot migration with downtime is the right call.

**Estimated downtime window:** 1–3 hours (schema creation + data migration +
deployment + smoke test).

**Cutover sequence:**

| Step | Action | Rollback path |
|------|--------|---------------|
| 1 | Take the current app offline (unlist from Netlify or put up a maintenance page) | Remove maintenance page |
| 2 | Export sql.js database to `migration_export.json` | File is a safe snapshot |
| 3 | Export localStorage data via the browser tool | JSON file is the snapshot |
| 4 | Create Supabase project; save connection string + anon key + service role key | Delete the project |
| 5 | Run schema creation script in Supabase (all new tables with RLS disabled) | Drop all tables |
| 6 | Enable RLS on all tables | Disable RLS |
| 7 | Apply all RLS policies | Drop policies |
| 8 | Create the manager's Supabase Auth account | n/a |
| 9 | Create default organization, profiles row, memberships row | Delete rows |
| 10 | Run sql.js import script → inserts documents, blocks, backlinks | Truncate tables |
| 11 | Run localStorage import (POST /api/migrate/localStorage) | Truncate tables |
| 12 | Deploy new server code (Express + Supabase client; remove sql.js) | Revert deploy |
| 13 | Deploy new client code (Supabase Auth; remove localStorage auth) | Revert deploy |
| 14 | Smoke test: sign in, confirm documents visible, confirm employees visible | Revert deploy |
| 15 | Bring app back online | Remove maintenance page |

**Go / no-go gate after step 14:** If any smoke test fails, revert steps 12–13
(redeploy old code). The Postgres data is still intact and migration can be
reattempted once the bug is fixed. The sql.js database is untouched throughout.

---

## 3. Row Level Security policies (plain English)

RLS is enabled on every table in the public schema. The following policies
define who can read and write each table. SQL comes in Session 2; this section
is policy intent.

**Default pattern for org-scoped tables:**
> A row is visible to a user if and only if the user has an active membership
> in the org that owns the row. A row can be written only if the same
> condition holds.

### `profiles`
- **SELECT:** A user can read their own profile always. A user can also read
  profiles of other members in their org (needed for member lists, assignee
  displays, etc.).
- **INSERT:** Handled by the `auth.users` trigger; no direct app insert.
- **UPDATE:** A user can update only their own profile.
- **DELETE:** Not permitted via app; only via account deletion.

### `organizations`
- **SELECT:** A user can read an organization if and only if they have a
  membership row in that org.
- **INSERT:** Any authenticated user can create an organization (v1: a manager
  creates one at signup). No existing membership required to insert.
- **UPDATE:** Only the `owner_user_id` of the org can update it (rename, etc.).
- **DELETE:** Not permitted in v1. Org deletion is out of scope.

### `memberships`
- **SELECT:** A user can read memberships where `org_id` matches any org the
  user themselves is a member of. This lets a manager see all members of their
  org. It also lets a user read their own membership record for session load.
- **INSERT:** A user with `role = 'manager'` in an org can insert new
  membership rows for that org. (The invite-use flow runs via a server-side
  function with service role, but the policy covers direct API access.)
- **UPDATE:** Managers can update memberships in their org (e.g., role changes).
  Users cannot update their own membership row.
- **DELETE:** Managers can delete memberships in their org (remove a member).
  Users cannot remove themselves via direct API.

### `invites`
- **SELECT (normal):** A manager in an org can read all invite rows for that
  org.
- **SELECT (code lookup — special case):** Any unauthenticated or newly
  authenticated user can read a single invite row by its `code` column, but
  only the columns needed to validate the invite (`code`, `role`, `org_id`,
  `expires_at`, `used_at`). This supports the "enter invite code" flow before
  the account exists. Implementation: a Postgres function (`validate_invite_code(code TEXT)`) with `SECURITY DEFINER` returns only the needed fields; the policy on the table itself restricts direct SELECT to managers.
- **INSERT:** Managers can insert invite rows for their org.
- **UPDATE:** The invite-redemption flow uses a server-side function (service
  role) to set `used_at` and `used_by_user_id`. Managers cannot modify `used_*`
  fields directly.
- **DELETE (revoke):** Managers can delete unused invites from their org.
  Used invites cannot be deleted (audit trail).

### `documents`
- **SELECT/INSERT/UPDATE/DELETE:** Standard org-scope policy. User must have a
  membership in `documents.org_id`.
- Additional refinement in application code (not RLS): `doc_type = 'db_row'`
  documents are not listed in the sidebar tree. RLS does not enforce this — it
  is a UI filter only.

### `blocks`
- Standard org-scope policy. `blocks.org_id` must match a user's membership.

### `backlinks`
- Standard org-scope policy. `backlinks.org_id` must match a user's membership.

### `employees`
- **SELECT:** Any member of the org can read employee rows. Interns can see
  the roster (needed for daily updates, calendar attendee lookup, etc.).
- **INSERT/UPDATE:** Manager-only. Enforced both at the RLS level (policy checks
  the user's `role` in `memberships`) and at the application layer.
- **DELETE:** Manager-only (deactivate, not hard-delete, in v1).

### `leave_records`
- **SELECT:** Any member of the org can read leave records. (Interns can see
  their own leave history; managers see all.)
- **INSERT/UPDATE:** Manager-only.
- **DELETE:** Manager-only.

Note: the intern's personal leave view (`EmployeeLeaveView`) shows only rows
where `employee_id` matches the intern's own employee record. This filter is
applied in the application query, not via RLS. RLS ensures the intern can only
read their own org's records; the application narrows it further.

### `calendar_events`
- Standard org-scope policy. All org members can read and create events. Only
  the `created_by_user_id` or a manager can update/delete an event.
- **No privacy flag in v1.** All events in an org are visible to all org
  members. If a "private event" feature is needed later, it is a one-column
  migration (`is_private BOOLEAN NOT NULL DEFAULT false`) and a policy
  amendment — no restructuring required.

### `daily_updates`
- Standard org-scope policy. Managers can read all; interns can read only their
  own. This difference is enforced in the application query, not via RLS (same
  pattern as leave records).

### `monthly_reports`
- Same pattern as daily_updates.

### `databases`, `db_properties`, `db_property_values`, `db_views` (Phase 3+)
- Standard org-scope policy on all four. Any org member can read; write
  permissions TBD in Phase 3 planning (likely all members can create databases,
  but only the creator or managers can delete).

---

## 4. Auth migration

### 4.1 Current auth model

| Aspect | Current |
|--------|---------|
| Storage | `craft_auth` localStorage key: `{ id, name, email, role }` |
| Accounts | `craft_accounts` localStorage key: array of accounts |
| Manager password | `craft_manager_password` localStorage key |
| Sessions | None — any page load reads localStorage |
| Sign-in flow | Enter name → pick role → app |
| Passwords | Manager has a password; interns do not |
| Server awareness | The Express server has no knowledge of who is signed in |

### 4.2 Target: Supabase Auth

| Aspect | Target |
|--------|--------|
| Storage | Supabase Auth JWTs stored in browser (managed by Supabase client) |
| Accounts | Supabase `auth.users` table (email + password or magic link) |
| Sessions | Supabase manages session refresh automatically |
| Sign-in flow | Enter email + password → Supabase Auth → JWT → app |
| Passwords | All users have passwords (or use magic link in future) |
| Server awareness | Express middleware validates JWT from Authorization header; all requests are authenticated |
| Role | Derived from `memberships.role` at session load; stored in client Zustand state |

### 4.3 Migration sequence

The auth migration and data migration must be ordered carefully because the
default organization's `owner_user_id` references a Supabase Auth user that
doesn't exist until sign-up.

**Correct order:**
1. Schema is live in Supabase (Step 5 of cutover sequence).
2. Manager completes Supabase Auth sign-up (Step 8 of cutover) — this creates
   `auth.users` row and triggers `profiles` insert.
3. Default organization is created with `owner_user_id = manager.id` (Step 9).
4. Manager's `memberships` row is created (Step 9).
5. Data migration runs (Steps 10–11) — all rows get `org_id` from the
   default org created in step 3.
6. New app code is deployed (Steps 12–13).
7. On first sign-in after deployment, the app reads `memberships` to get role
   and loads the org context.

**localStorage cleanup:** After successful migration, the manager should clear
the old localStorage keys (`craft_auth`, `craft_accounts`, `craft_manager_password`,
`leave_employees`, and any other data keys). The app no longer reads them after
migration. If they are not cleared, they sit dormant — they do not interfere
with the new Supabase Auth flow.

### 4.4 First sign-in after migration

Existing users (only the developer at migration time) already have Supabase
Auth accounts created in step 8. For any user who wasn't migrated manually,
the flow is:
- If a user has an invite code → intern signup flow (see §6.2).
- If a user was the original manager → their account exists; plain sign-in.

"Email matching" (prompting users to link their existing data via email) is
not needed for v1 because the developer controls all accounts and performs
the migration themselves. If a future scenario requires migrating an existing
user's data to a newly-created Supabase Auth account, match on email:
find the `employees` row where `employees.email = auth.users.email` and set
`employees.user_id = auth.users.id`.

---

## 5. Application-layer changes

### 5.1 Server: Express routes

**New auth middleware** (`server/middleware/auth.js`):
Validates the Supabase JWT from the `Authorization: Bearer <token>` header on
every request. Extracts `user_id`. Looks up the user's `memberships` row for
their org_id and role. Attaches `{ userId, orgId, role }` to `req.auth`.
Requests without a valid JWT return 401.

**Pattern for every route:** All reads and writes now include
`WHERE org_id = req.auth.orgId`. The service role key is used only for admin
operations (migrations, invite redemption, the localStorage import endpoint).

**Existing routes — changes:**

| Route | Change |
|-------|--------|
| `GET /api/documents` | Add `AND org_id = $orgId` filter |
| `POST /api/documents` | Set `org_id = req.auth.orgId` on insert |
| `PATCH /api/documents/:id` | Verify `org_id = req.auth.orgId` before update |
| `DELETE /api/documents/:id` | Verify `org_id = req.auth.orgId` before delete |
| `GET /api/documents/:id/blocks` | Add `AND org_id = $orgId` filter |
| `POST /api/blocks` | Set `org_id = req.auth.orgId` |
| `PATCH /api/blocks/:id` | Verify `org_id = req.auth.orgId` |
| `DELETE /api/blocks/:id` | Verify `org_id = req.auth.orgId` |
| `GET /api/search` | Add `AND org_id = $orgId` to full-text query |
| `GET /api/export/:id` | Verify `org_id = req.auth.orgId` on document lookup |
| `POST /api/assistant` | No data changes; pass-through (mock); no org filter needed |

**New routes — Phase 7:**

| Route | Purpose |
|-------|---------|
| `POST /api/organizations` | Create org (manager at first sign-up) |
| `GET /api/organizations/current` | Get the requesting user's org |
| `PATCH /api/organizations/:id` | Rename org (manager only) |
| `GET /api/organizations/:id/members` | List members (manager only) |
| `DELETE /api/organizations/:id/members/:userId` | Remove member (manager only) |
| `GET /api/organizations/:id/invites` | List pending invites (manager only) |
| `POST /api/organizations/:id/invites` | Create invite (manager only) |
| `DELETE /api/organizations/:id/invites/:inviteId` | Revoke invite (manager only) |
| `GET /api/invites/validate/:code` | Validate code (unauthenticated) |
| `POST /api/invites/use` | Use invite code (creates membership) |
| `GET /api/employees` | List employees (org-scoped) |
| `POST /api/employees` | Create employee (manager only) |
| `PATCH /api/employees/:id` | Update employee (manager only) |
| `DELETE /api/employees/:id` | Deactivate employee (manager only) |
| `GET /api/leave-records` | List leave/overtime (org-scoped; intern sees own) |
| `POST /api/leave-records` | Create leave record (manager only) |
| `GET /api/calendar-events` | List events (org-scoped) |
| `POST /api/calendar-events` | Create event |
| `PATCH /api/calendar-events/:id` | Update event (creator or manager) |
| `DELETE /api/calendar-events/:id` | Delete event (creator or manager) |
| `GET /api/daily-updates` | List updates (manager: all; intern: own) |
| `POST /api/daily-updates` | Create/update own update |
| `GET /api/monthly-reports` | List reports (manager: all; intern: own) |
| `POST /api/monthly-reports` | Create/update own report |
| `POST /api/migrate/localStorage` | One-time migration endpoint (removed after use) |

### 5.2 Frontend: current org resolution

At session load, the app must determine:
1. Who the user is (from Supabase Auth session)
2. What org they belong to (from `memberships`)
3. What role they have (from `memberships.role`)

**Recommendation:** Create a Zustand `authStore` (or extend the existing store
pattern) with these fields:
```
userId: string | null
orgId: string | null
role: 'manager' | 'intern' | null
userName: string | null
```

On app mount:
1. Call `supabase.auth.getSession()` → get user.
2. If no session → show sign-in screen.
3. If session → `GET /api/organizations/current` → returns `{ org, membership }`.
4. If no membership (manager who abandoned org creation) → show "create your
   organization" screen.
5. If membership exists → set `authStore.{ orgId, role }` → load the app.

Every API call from the frontend includes the Supabase JWT in the
`Authorization: Bearer` header (Supabase client does this automatically for
requests made through its own API; for custom Express routes, the frontend
must attach the token manually from `supabase.auth.getSession().access_token`).

### 5.3 Role-based routing — where it changes

Currently, role is read from `localStorage.craft_auth.role`. Every place this
occurs must change to reading `authStore.role` instead.

**Known locations that use localStorage role (to be verified in Session 2):**

| Location | Current source | After migration |
|----------|----------------|-----------------|
| `ImagineView` / Leave Tracker routing | `craft_auth.role` | `authStore.role` |
| `EmployeeLeaveView` routing | `craft_auth.role` | `authStore.role` |
| `DailyUpdatesView` mode prop | `craft_auth.role` | `authStore.role` |
| `MonthlyReportsView` mode prop | `craft_auth.role` | `authStore.role` |
| `EmployeeProfilesView` access guard | `craft_auth.role` | `authStore.role` |
| Sidebar item visibility | `craft_auth.role` | `authStore.role` |
| `craft_manager_password` check | localStorage key | Removed; Supabase Auth handles passwords |
| `craft_accounts` picker | localStorage key | Removed; Supabase Auth handles accounts |

The role values themselves (`'manager'` / `'intern'`) do not change — only the
source changes from `localStorage` to `authStore`. This means all the
conditional rendering logic (`role === 'manager'`) is unchanged; only the
import/read path changes.

---

## 6. Sign-up, sign-in, and "create your organization"

### 6.1 Manager sign-up flow

```
Landing / sign-in page
  → "Sign up" option
  → Enter name + email + password
  → Supabase Auth creates account
  → App detects: authenticated user, no membership
  → "Create your organization" screen
      → Enter org name
      → POST /api/organizations
      → org row created, memberships row created (role: manager)
  → Into the app as manager of the new org
```

The "create your organization" screen is the ONLY path to manager access. It
cannot be skipped — the app checks for `authStore.orgId` on every route and
redirects to this screen if it's null.

### 6.2 Intern sign-up flow

```
Landing / sign-in page
  → "I have an invite code" option
  → Enter email + password + invite code
  → Validate code: GET /api/invites/validate/:code
      → Code is valid, not expired, not used → proceed
      → Code invalid/expired/used → show specific error (see §6.4)
  → Supabase Auth creates account (or signs in if account exists)
  → POST /api/invites/use { code, userId }
      → memberships row created with role = invite.role
      → invite.used_at = NOW(), invite.used_by_user_id = userId
      → Employee linking (in priority order):
          1. invite.employee_id set → employees.user_id = userId (direct)
          2. invite.employee_id null → match employees.email to
             auth.users.email (case-insensitive)
             → exactly one match → employees.user_id = userId
             → zero or multiple matches → user_id left null; flagged
               for manager to resolve on the employee profile page
  → Into the app in the inviting org with the assigned role
```

Interns never see the "create your organization" screen.

### 6.3 Returning user sign-in (both roles)

```
Sign-in page
  → Enter email + password
  → Supabase Auth validates → JWT issued
  → App reads memberships → sets authStore.{ orgId, role }
  → Into the app
```

No role picker. No manager password. No account list.

### 6.4 Edge cases

**Manager abandons "create your organization" screen.**
The manager's `auth.users` row exists but no `organizations` or `memberships`
row. On every subsequent sign-in, the app detects `orgId === null` and returns
them to the "create your organization" screen. No app features are accessible
until the org is created. The "create your organization" screen is not
dismissible.

**Intern tries to sign up without an invite code.**
The standard "Sign up" path is manager-only in v1. Interns must use the
"I have an invite code" path. If an intern reaches the standard signup form
(e.g. by direct URL), and they complete it, they will have a `auth.users` row
but no membership. The app will detect `orgId === null` and show the "create
your organization" screen — since they are not a manager, this creates an
incorrect state. Mitigation: the "create your organization" screen should
detect this scenario (no invite-code in their session history) and show a
message: "To join an existing organization, you'll need an invite code from
your manager. Contact your manager to receive one." Offer a "Sign out" link.
They cannot create an org (the org creation endpoint could be gated to prevent
this, though in v1 it is open). A simpler v1 approach: don't offer a general
"Sign up" button at all on the landing page; only show "Sign in" and "I have
an invite code." New managers sign up by clicking "Create an account" within
the invite-code flow's alternate path, or the landing page explicitly labels
the "Sign up" CTA as "Create a new organization."

**Invite code already used.**
`GET /api/invites/validate/:code` returns `{ valid: false, reason: 'used' }`.
The UI shows: "This invite code has already been used. Ask your manager for a
new one."

**Invite code expired.**
`{ valid: false, reason: 'expired' }`. The UI shows: "This invite code has
expired (invites are valid for 7 days). Ask your manager for a new one."

**Invite code revoked (deleted by manager).**
The row no longer exists. Validate endpoint returns `{ valid: false,
reason: 'not_found' }`. The UI shows: "This invite code is not valid. Check
that you copied it correctly, or ask your manager for a new one."

**Intern already has an account with a different org (v1 — one org per user).**
If the user is already authenticated with an active membership, and they try to
use an invite code from a different org, the `POST /api/invites/use` endpoint
checks: if `memberships` already contains a row for this `user_id` with a
different `org_id`, return a 409 error. The UI shows: "You are already a
member of another organization. In v1, each account can only belong to one
organization. Sign out and create a new account if you need to join a different
organization, or contact support."

---

## 7. The invite UI (the visible feature)

This is the user-facing feature that Phase 7 adds. Everything else in this
document is infrastructure.

### 7.1 Organization Settings page

A new page accessible to managers only via the sidebar (e.g., under My Space
or a new "Team" sidebar section). Route: `/org-settings` or as a tab in the
existing Settings modal.

**Sections:**
1. **Organization details** — org name (inline-editable text field; in scope
   for Session 2), owner name, created date. Save via PATCH /api/organizations/:id.
   Validation: non-empty string only. No rename history.
2. **Invite new member** — form: role selector (Manager / Intern), "Generate
   invite code" button. On submit, creates the invite and shows the code in a
   copyable chip. Note the 7-day expiry on the chip.
3. **Pending invites** — table: code (redacted to last 4 chars), role, created
   date, expires date, status (Active / Expired). Actions: Copy code (reveals
   full code), Revoke (DELETE /api/invites/:id, disabled if already used/expired).
4. **Current members** — table: name, role, joined date, status
   (Active / Deactivated). Actions: Change role (PATCH /api/memberships/:id,
   manager-only), Remove (DELETE /api/members/:userId). Removing a member
   deactivates their membership; their data stays in the org.

### 7.2 Invite code format

- 8 characters, uppercase alphanumeric.
- Generated with `crypto.randomBytes(6)` → base32-ish encoding → slice to 8
  characters. Exclude ambiguous characters (0/O, 1/I/L).
- Example: `A3B7X2M9`.
- Human-readable: can be read over a chat message or email body.
- 7-day default expiry. No per-invite expiry override in v1.

### 7.3 Member list states

| Status | Meaning |
|--------|---------|
| Active | Has a memberships row; can sign in and access the org |
| Invited | An invite code was issued but not yet used (no membership row yet) |
| Deactivated | Membership row exists but is marked inactive; cannot access the org |

"Removed" (deactivated) members retain their data in the org. Their documents,
leave records, and updates belong to the org, not the user. They can be
re-invited by generating a new invite code and asking them to sign in again.

### 7.4 Removing a member

On "Remove member": the manager confirms in a dialog. The membership row is
marked `status = 'deactivated'` (add `status TEXT DEFAULT 'active'` to
`memberships`). The removed user's next API request will fail with 403 (their
membership is no longer active). Their data stays in the org. The `employees`
table row (if any) is not touched — they remain in the leave tracker roster.

---

## 8. What breaks during the transition

This section exists for the developer's benefit — the only "user" at migration
time is the developer.

| Behavior | Before | After |
|----------|--------|-------|
| Sign-in flow | Name → role picker → app | Email + password → app |
| Manager password | Separate manager password prompt | Replaced by Supabase Auth password |
| Account list | `craft_accounts` picker on sign-in | Gone; Supabase Auth manages accounts |
| Role assignment | Picked at sign-in | Derived from membership; set once at invite-use or org-create |
| Session persistence | `localStorage.craft_auth` survives tab close | Supabase JWT survives tab close (same UX) |
| Employee data | In manager's browser localStorage | In Postgres; requires migration step |
| Leave records | In manager's browser localStorage | In Postgres; requires migration step |
| Calendar events | In each user's browser localStorage | In Postgres (shared across org after migration) |
| Backend database | sql.js (file: `server/db/craft.db`) | Supabase Postgres |
| Server startup | Reads `craft.db` from disk | Connects to Supabase via env vars |
| Documents | In sql.js → migrated to Postgres | Same documents, now in Postgres |
| Features temporarily unavailable | None | All features unavailable during cutover window (1–3 hrs) |
| `_redirects` / Netlify routing | Already present (SPA routing) | Unchanged |
| Assistant | Mock SSE; unchanged | Unchanged |
| Phase 3–6 (not yet built) | Will target sql.js | Will now target Postgres; DATABASES.md SQLite DDL is reference only |
| URL structure | Unchanged | Unchanged |
| Theme / accent / image theme | localStorage; unchanged | localStorage; unchanged (UI preferences are not org data) |

**Importantly:** After migration, the old localStorage data (employees, leave,
calendar) still exists in the manager's browser but the app no longer reads or
writes it. There is no risk of the old data surfacing — the new code only reads
from Postgres. The manager can clear it manually or leave it (it is inert).

---

## 9. Testing isolation

This test plan is executed in Session 2 (implementation), after the migration.
The cases are defined here so they exist before implementation begins.

### Setup
- Create two test organizations: **Org A** ("Test Company A") and **Org B**
  ("Test Company B").
- Create two test users: **User A1** (manager in Org A) and **User B1**
  (intern in Org B).
- Create sample data in each org: one document per org (distinct titles),
  one employee record per org.

### Test cases

| # | Test | Expected result |
|---|------|-----------------|
| T1 | Sign in as User A1; fetch GET /api/documents | Returns only Org A's documents |
| T2 | Sign in as User A1; directly request Org B's document ID | 403 or empty result |
| T3 | Sign in as User B1 (intern); fetch GET /api/documents | Returns only Org B's documents |
| T4 | Sign in as User B1; try to create a document | Succeeds (interns can create documents) |
| T5 | Sign in as User B1; try to access an employee record from Org A | 403 or empty |
| T6 | Sign in as User A1; try to invite a user with a POST to /api/organizations/Org-B-id/invites | 403 |
| T7 | RLS direct bypass test: connect to Supabase DB directly with anon key; execute SELECT on documents without auth header | Returns 0 rows (RLS blocks unauthenticated access) |
| T8 | RLS direct bypass test: with User A1's JWT, SELECT documents WHERE org_id = Org-B-id | Returns 0 rows (RLS prevents cross-org reads even with a valid JWT) |
| T9 | Invite flow: generate invite code in Org A; sign in as a new user and use the code; confirm membership is in Org A with correct role | Membership created; user can see Org A data |
| T10 | Invite reuse: try to use an already-used invite code | 409 or validation error |
| T11 | Invite expiry: manually set an invite's expires_at to past; try to use it | Validation rejects with 'expired' |
| T12 | Manager removes User B1 from Org B; User B1 attempts API request | 403 |
| T13 | Sign in as User B1 (intern); try to call POST /api/employees | 403 (manager-only) |
| T14 | Leave tracker: User A1 creates a leave record for an Org A employee; User B1 tries to read it | Empty or 403 |

### RLS bypass verification

Test T7 and T8 verify that RLS works even if application code is bypassed:
- Connect to the database using the **anon key** (not service role).
- Without any JWT claim, RLS should return 0 rows on all org-scoped tables.
- With User A1's JWT, RLS should return only Org A rows regardless of the
  `org_id` filter in the query.

This proves that a bug in the Express application layer (e.g., accidentally
omitting `WHERE org_id = ?`) does not leak cross-org data.

---

## 10. Open questions for the owner

All six questions raised during initial planning have been answered and folded
into the document. No open questions remain before Session 2.

| # | Question | Answer | Where reflected |
|---|----------|--------|-----------------|
| Q1 | Employee pre-creation | Nullable `employees.user_id` confirmed | §1.4 employees table |
| Q2 | Invite-to-employee link | `invites.employee_id` (nullable FK); email fallback when null | §1.1 invites, §1.4 employees, §6.2 |
| Q3 | Calendar visibility | Fully shared within org; no privacy flag in v1 | §3 calendar_events |
| Q4 | localStorage migration trigger | Automatic `/migrate` route on first post-migration sign-in | §2.4 |
| Q5 | Supabase tier | Free tier now; upgrade to Pro at first real client onboarding | §2.1 |
| Q6 | Org rename scope | In scope for Session 2; single editable field, non-empty only | §1.1 organizations, §7.1 |

If new questions arise during Session 2 implementation, add them here.

---

## 11. What this phase does NOT cover

Explicitly out of scope for the planning document and for the migration session:

- The AI assistant. Remains mock in Phase 7.
- Notion import (Phase 8). Depends on Phase 7 completing first. The
  `import_jobs` table is noted in §1.7 for alignment but is not built in Phase 7.
- AI categorization (Phase 9).
- Notion API/OAuth (Phase 10).
- Billing or Stripe integration.
- Document collaboration or real-time editing.
- Email-based invites (post-v1). Invite codes are sufficient for v1.
- Multi-org membership UI. Schema supports it; UI does not. No org-switcher.
- Phase 3–6 database views (Kanban, timeline, etc.). The schema established in
  Phase 7 is the foundation they will build on.
- Inline databases (explicitly deferred per DATABASES.md).
- Employee Documents (explicitly deferred per BUILD_PLAN.md — all three
  prerequisites, including Phase 7 shipping, must be met first).

---

## Cross-reference notes for future sessions

**docs/DATABASES.md:**
- The SQLite DDL in §2a–§2b is now a design reference only. Phase 3 will target
  Postgres. All types must be translated (see §2.2 of this document). The
  `is_primary` partial unique index constraint can be a real DB constraint in
  Postgres (see §1.5 of this document).
- The note "enforced at the application layer" for `is_primary` is resolved by
  Postgres partial unique index support. Remove that caveat when Phase 3 is built.
- §3 ("do not add org_id in Phases 3–6") is now superseded. Phase 7 runs first;
  all Phase 3 tables get org_id from creation. DATABASES.md §3 will be updated
  in Session 2 to reflect this.

**docs/NOTION_IMPORT.md:**
- §4 references table `orgs(id)`. The Phase 7 table is `organizations`. Correct
  `import_jobs.org_id REFERENCES orgs(id)` → `REFERENCES organizations(id)` when
  Phase 8 is built.
- The `import_jobs` SQLite DDL in §4 needs Postgres types (see §2.2 of this
  document). Update when Phase 8 is implemented.
- The assumption "Imports are scoped to org_id (per Phase 7)" is confirmed
  correct. No conflict here — just the table name.
- Open question 1 from NOTION_IMPORT.md §5 (broken relation cell renderer):
  The answer is to build broken-relation rendering as part of Phase 6 (before
  Phase 8), not as a retrofit. This can be noted when Phase 6 is planned.
