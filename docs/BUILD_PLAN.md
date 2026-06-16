# BUILD_PLAN.md

Each phase is independently shippable. Each has a task checklist and a
"done when" line that defines the exit criterion.

---

## Phase 1 — Core block editor ✅ Done

**Goal:** A working document editor with persistent storage.

- [x] Block types: text, h1, h2, h3, bullet, numbered, todo, code, quote,
      divider, callout, image, page, table (rows × cols, optional header row),
      columns2 (two side-by-side text columns), columns3 (three columns)
- [x] `InlineNode` AST for inline formatting (bold, italic, underline, strike,
      code, link)
- [x] Document tree: CRUD, nesting, drag-to-reorder, favorites, emoji, cover
- [x] Slash command menu (`/` to open, filter by keyword)
- [x] Format toolbar (selection → floating toolbar)
- [x] Keyboard shortcuts: Enter splits, Backspace merges, Tab indents lists,
      `Ctrl/Cmd+B/I/U` for inline formatting
- [x] Markdown shortcuts (`#` → h1, `-` → bullet, `[]` → todo, etc.)
- [x] Full-text search across documents and block content
- [x] Backlinks: documents that link to the current page
- [x] Markdown export (per document, including all block types)
- [x] sql.js backend with debounced file persistence
- [x] Local auth (sign-in → name → role → app; localStorage only;
      roles: Manager and Intern only)

**Done when:** A user can create, edit, navigate, and search documents; export
any document as Markdown; sign out and sign back in.

---

## Phase 2 — Calendar, assistant, settings ✅ Done

**Goal:** The app is usable as a daily workspace tool, not just a text editor.

- [x] Calendar view: month grid (accent-coloured day headers, today highlight,
      month/year/decade drill-down), list view, Month ↔ List toggle
- [x] Multi-day selection on calendar (Select button + Ctrl+click)
- [x] Booking modal: title, purpose, attendees (tag input), start/end time,
      colour picker, Book / Mark as Busy toggle; events persisted to localStorage
- [x] Events rendered on calendar cells (coloured pills + busy tint)
- [x] AI assistant panel (mock SSE streaming, context-aware, suggestion buttons,
      New Chat, Fast/Auto mode toggle)
- [x] Settings modal: Account (sign-out), My Subscriptions, Integrations,
      Assistant, Notifications (toggles), About, Appearance (theme + accent),
      Language, Advanced, Published Content, Tags, Space Settings
- [x] Dark/light theme toggle; accent colour grid + custom colour picker;
      selections persisted to localStorage
- [x] Promo popup (bottom-right, 3 s delay, dismissible, localStorage flag)
- [x] My Space dropdown in sidebar (Settings, Sign Out)
- [x] Sign-out clears auth and returns to sign-in screen
- [x] Calendar ⋯ menu: Daily Notes / Tasks visibility toggles
- [x] **Leave Tracker** (Manager view — `ImagineView`): full dashboard showing
      all employees' leave balances, low-balance alerts, and recent leave
      activity; per-employee detail with month-by-month accrual table; leave
      recording modal (annual / sick / family, days, date, reason); overtime
      recording modal; deactivate / reactivate / remove employees; archive view
      for deactivated staff — all persisted to localStorage
- [x] **Leave Tracker** (Intern view — `EmployeeLeaveView`): personal
      read-only view of accrued / used / balance for annual, sick, and family
      leave with a month-by-month history table
- [x] **Daily Updates** view: manager sees all employees' updates; intern sees
      their own (`DailyUpdatesView`, `mode: 'manager' | 'employee'`)
- [x] **Monthly Reports** view: same dual-mode pattern as Daily Updates
      (`MonthlyReportsView`)
- [x] Role-based routing: Manager gets full Leave Tracker + all views; Intern
      sees personal leave + own updates/reports only; role and employeeId
      persisted in `craft_auth` localStorage key
- [x] **Employee Profiles** (`EmployeeProfilesView`): manager-only two-panel
      view replacing "Shared with Me". Left panel: searchable employee list with
      avatar initials, status badges, and quick status indicators. Right panel:
      tabbed profile detail — Overview (identity, tenure), Leave (live accrual
      cards + history table), Contact (phone, address, emergency contact), Notes
      (manager-only text, auto-saved on blur), Documents (deferred notice). Add /
      Edit modal with name, email, job title, department, start date, employment
      type (intern/full-time/contractor), app role, phone, address, emergency
      contact. Deactivate / reactivate / delete actions via "More" menu.
      Extends `leave_employees` localStorage key with new optional fields —
      backward-compatible with Leave Tracker and EmployeeLeaveView.
- [ ] **Employee Documents** — per-employee file uploads from the profile page
      are **explicitly deferred**. See the "Employee Documents" entry in the
      Deferred section below for the gating conditions and compliance
      requirements that must be met before this is built.

**Done when:** A user can book calendar events, chat with the assistant, change
their theme and accent colour, and sign out, all without a page reload. A
manager can track and record leave and overtime for all employees; an intern
can view their own leave balance.

---

## Phase 3 — Database schema foundation ⏳ Planning

**Goal:** Land all schema and type changes that Phases 4–6 depend on. No new UI.
This phase is purely additive — existing features must not break.

See [`docs/DATABASES.md`](DATABASES.md) for the data model rationale.

### Server / DB

- [ ] Add migration helper to `server/db/database.js` that runs `ALTER TABLE`
      and `CREATE TABLE IF NOT EXISTS` statements idempotently on startup
      (catches and ignores "column already exists" errors, same pattern as the
      existing `linked_doc_id` migration)
- [ ] Migrate `documents`: add `doc_type TEXT NOT NULL DEFAULT 'page'`
      (values: `'page'` | `'db_row'`) and `database_id TEXT` (FK to `databases.id`,
      null for regular pages)
- [ ] Create table `databases` — see DATABASES.md for full schema
- [ ] Create table `db_properties` — column definitions per database
- [ ] Create table `db_property_values` — typed value per (document × property)
- [ ] Create table `db_views` — view config (type, visible props, filters, sorts,
      groupBy, conditionalColors) stored as JSON

### Routes (no UI consumed yet — available for Phase 4)

- [ ] `GET /api/databases` — list all databases
- [ ] `POST /api/databases` — create database (also creates a first default
      view: table, and a primary text property: Title)
- [ ] `GET /api/databases/:id` — database metadata + properties + views
- [ ] `PATCH /api/databases/:id` — update title/icon/cover
- [ ] `DELETE /api/databases/:id` — soft-delete database and all its rows
- [ ] `GET /api/databases/:id/properties` — list properties
- [ ] `POST /api/databases/:id/properties` — add property
- [ ] `PATCH /api/db-properties/:id` — rename, retype, reorder, update config
- [ ] `DELETE /api/db-properties/:id` — remove property + its values
- [ ] `GET /api/databases/:id/rows` — list rows with all property values
      (supports `?filter=`, `?sort=`, `?group=` query params — parse but can
      return unfiltered for now)
- [ ] `POST /api/databases/:id/rows` — create row: inserts a `db_row` document
      + default property values; returns the full document
- [ ] `GET /api/db-property-values/:documentId` — all property values for one row
- [ ] `PATCH /api/db-property-values/:documentId/:propertyId` — set one value
- [ ] `GET /api/databases/:id/views` — list views
- [ ] `POST /api/databases/:id/views` — add view
- [ ] `PATCH /api/db-views/:id` — update view config
- [ ] `DELETE /api/db-views/:id` — delete view

### Types / Client (no UI)

- [ ] Add database-related TypeScript types to `client/src/types/index.ts`:
      `Database`, `DbProperty`, `PropertyType` (enum), `PropertyConfig`,
      `DbPropertyValue`, `DbView`, `ViewType`, `ViewConfig`, `DbRow`
- [ ] Add database API methods to `client/src/api/index.ts` matching the routes
      above
- [ ] Add `'database'` block type to `BlockType` union (renders a placeholder in
      Phase 3; full renderer in Phase 4)

**Done when:** All tables exist in `craft.db`, all routes return correct JSON
when hit with curl/Postman, TypeScript compiles without errors, and no existing
tests or manual flows are broken.

---

## Phase 4 — Database MVP: table view ⏳ Planned

**Goal:** A user can create a database, define properties, add rows, open a row
as a full page, and filter/sort/group the table. First sellable database
feature.

### Block menu entry point

- [ ] Add `database` to `BLOCK_MENU_ITEMS` in `types/index.ts` with keywords
      `['database', 'table', 'grid', 'spreadsheet']`
- [ ] `DatabaseBlock` component: when `linked_db_id` is unset shows a
      "Create database" picker; when set renders the database in-place
- [ ] Selecting "Database" from slash menu: calls `POST /api/databases`, sets
      `linked_db_id` on the block, navigates to the database view

### Navigation

- [ ] In `AppLayout` sidebar: add a "Databases" section listing all databases
      (same tree-item style as documents)
- [ ] `documentStore`: distinguish `db_row` documents — navigating to one opens
      the block editor (same as today), not the database view
- [ ] Routing: clicking a database in the sidebar shows `DatabaseView` instead
      of `DocumentEditor`

### Table view — display

- [ ] `DatabaseView` component: header (title, icon, view tabs), table, row
      creation button
- [ ] `TableView` component: column headers (property names + type icons),
      sortable; rows mapped to `db_row` documents; cells show property values
- [ ] `PropertyCell` component: renders value for each `PropertyType`; editable
      in-place for text, number, checkbox, select, multi-select, status, URL,
      email, phone, date
- [ ] Row title column always shows `document.title`; editing it calls
      `PATCH /api/documents/:id` (title)
- [ ] "Open" icon on row → navigates to that row's document in the block editor
      (back-button returns to database view)

### Property types for Phase 4

Implement these property types (config UI + cell renderer + value storage):

- [ ] `text` (plain text, default for new properties)
- [ ] `number` (integer or decimal; optional number format: plain, dollar, %, etc.)
- [ ] `select` (single coloured tag; options defined per property)
- [ ] `multi_select` (multiple coloured tags)
- [ ] `status` (select variant with built-in groups: To Do / In Progress / Done;
      customisable options within groups)
- [ ] `date` (date picker; optional time component)
- [ ] `checkbox` (boolean)
- [ ] `url`, `email`, `phone` (text with type-specific display/validation)
- [ ] `created_time`, `last_edited_time` (auto-populated, read-only)

Defer to Phase 6: `relation`, `rollup`, `formula`, `person`, `files`.

### Property management

- [ ] "+" button on table header → add property (name + type picker)
- [ ] Click property header → rename, change type (with value migration
      warnings), reorder (drag), hide in this view, delete
- [ ] Property type icons in column headers

### Filter / sort / group (per view, stored in `db_views.config`)

- [ ] Filter: add rule (property + operator + value); multiple rules with
      AND logic; active filters shown as chips in toolbar
- [ ] Sort: add sort (property + asc/desc); multiple sorts; drag to reorder
- [ ] Group: group rows by a select, multi-select, status, or checkbox property;
      collapsible groups; "No value" group for unset rows
- [ ] Filters, sorts, and grouping are saved per view; switching views resets to
      that view's config

### View tabs

- [ ] View tab bar at top of `DatabaseView` (only table view in Phase 4)
- [ ] "Add view" button — reserved for Phase 5
- [ ] Rename view on double-click

**Done when:** A user can create a database via `/database` in the slash menu or
from the sidebar, add and rename properties of all Phase 4 types, add rows, edit
cells, open a row's page in the block editor, and apply filters/sorts/groups that
persist per view.

---

## Phase 5 — Additional database views ⏳ Planned

**Goal:** The same data can be visualised in five additional layouts. Each view
has its own independent filter/sort/group config.

- [ ] **Board (Kanban):** columns are groups of a select/status property; cards
      show title + configurable properties; drag cards between columns to update
      the grouped property; add column = add select option
- [ ] **List view:** single-column list of row titles with a subset of inline
      properties; compact row height; same filter/sort/group
- [ ] **Gallery view:** grid of cards; each card shows a cover image (from a
      files property or the row's document cover) + title + subtitle property
- [ ] **Calendar view (database):** rows with a date property plotted on a month
      grid; clicking a day opens a filtered list of rows for that day; distinct
      from the existing standalone calendar (Phase 2)
- [ ] **Timeline view:** Gantt-style bars for rows with start-date + end-date
      properties; pan/zoom; group by a property
- [ ] **"Add view" flow:** type picker modal (table / board / list / gallery /
      calendar / timeline); name the view; view-specific config (e.g. choose the
      grouping property for board, the date property for calendar/timeline)
- [ ] **Conditional row coloring:** per view, assign a colour to rows matching a
      filter condition (e.g. status = "Blocked" → red)
- [ ] **Show/hide properties per view:** property visibility toggle panel

**Done when:** All six view types (table from Phase 4 + five new) work on any
database; each view has independent filter/sort/group config and can be added,
renamed, and deleted; conditional row coloring works in table and list views.

---

## Phase 6 — Database power tools ⏳ Planned

**Goal:** Cross-database relations and computed properties. Enables CRM,
project trackers, and budgets built entirely inside the app.

- [ ] **Relation property:** link rows in database A to rows in database B;
      bidirectional by default (a matching back-relation is auto-created in B);
      cell shows linked row titles with chips; picker to add/remove links
- [ ] **Rollup property:** aggregates a property from related rows (count, sum,
      average, min, max, % checked, % not empty, etc.); configured as
      "relation property + property to aggregate + aggregation function"
- [ ] **Formula property:** computes a value from other properties in the same
      row using a formula language (arithmetic, string ops, `if()`, date math,
      `prop("name")` references); formula editor with syntax highlighting and
      autocomplete of property names
- [ ] **Person property:** links to a user record; shows avatar + name; in the
      current single-user model, "person" is a free-text field until multi-user
      is added
- [ ] **Files & media property:** upload a file or paste a URL; multiple files
      per cell; previews in gallery view; ties into the existing image block
      upload pattern
- [ ] **Rollup in formula:** allow formulas to reference rollup values
- [ ] **Relation depth guard:** prevent circular relation chains from causing
      infinite loops in rollup evaluation

**Done when:** A user can create a relation between two databases, add a rollup
that aggregates across it, write a formula that references other property values,
and all computed values update correctly when source values change.

---

## Phase 7 — Multi-tenancy / Postgres migration ⏳ Planned

**Goal:** Move off sql.js to a Postgres-backed, multi-tenant data layer so that
every subsequent phase (Notion import, billing, anything org-scoped) has real
`org_id` scoping and real auth to build on. This is an infrastructure phase —
it touches every table and every route, but adds no user-facing features by
itself.

See [`docs/DATABASES.md`](DATABASES.md) § Org scoping for the original
discussion of why this was deferred until now.

- [ ] Stand up a Postgres instance (Supabase-managed Postgres is the assumed
      target); connection config via env vars
- [ ] Add a `users` table; replace localStorage-only auth with session/JWT auth
- [ ] Add an `orgs` (workspaces) table and an `org_members` table
      (`user_id`, `org_id`, `role`)
- [ ] Add `org_id` to `documents`, `blocks`, `backlinks`, `databases`,
      `db_properties`, `db_property_values`, `db_views`
- [ ] Migration script: port existing sql.js data into Postgres under a single
      default org
- [ ] Enable Row-Level Security policies scoped by `org_id` on every table
- [ ] Replace `server/db/database.js` with a Postgres client (e.g. `pg`),
      preserving the existing query-shape conventions where practical
- [ ] Update every route to read/write `org_id` from the authenticated session
- [ ] Org switcher UI for users belonging to multiple orgs
- [ ] Bulk-insert path (or `import_mode` flag on the normal insert path) that
      accepts explicit `created_at`/`updated_at` timestamps, for Phase 8's
      Notion CSV "Created time"/"Last edited time" mapping

**Done when:** All data lives in Postgres, every row carries an `org_id`, RLS
prevents cross-org reads and writes, and every existing feature (editor,
calendar, databases) works unchanged for an authenticated user inside their org.

---

## Phase 8 — Notion import: zip-based, structural placement ⏳ Planned

**Goal:** A user can upload a Notion export zip and get their workspace
recreated — pages, hierarchy, and databases — with no AI involved. This is
"Phase A" of the Notion import effort and is shippable on its own.

See [`docs/NOTION_IMPORT.md`](NOTION_IMPORT.md) for the block mapping table,
database mapping, and pipeline design.

- [ ] "Import from Notion" entry point (Settings → Import); zip file upload
- [ ] `import_jobs` table (`org_id`-scoped) recording status, counts, and
      warnings for audit and resumability
- [ ] Unpack the zip server-side; walk Notion's exported folder structure
      (Markdown pages, CSV databases, `/attachments` or inline asset folders)
- [ ] Markdown → block AST parser, following the mapping table in
      NOTION_IMPORT.md (direct map / fallback / drop-with-warning)
- [ ] CSV → `databases` / `db_properties` / `db_property_values` parser,
      following the database mapping table in NOTION_IMPORT.md
- [ ] Dedicated bulk image/attachment upload path (server-internal, shares
      storage and naming conventions with the existing upload route but not
      its HTTP endpoint): copies images/files into app storage and rewrites
      `image_url` / files-property references to the new locations
- [ ] "Imported from Notion" root: every import creates (or reuses, per
      lineage) a single top-level page; the entire imported hierarchy nests
      under it via `documents.parent_id` — no merging into the existing
      sidebar tree
- [ ] Structural placement: recreate Notion's page/folder hierarchy under the
      "Imported from Notion" root — no AI, tree-preserving
- [ ] Toggle / toggleable-heading fallback: wrap flattened children in a
      `callout` block with a "Was a toggle in Notion" hint
- [ ] Broken relation placeholders: unresolved CSV relation references are
      stored as `{ _broken: true, title }` entries (not dropped) — see
      NOTION_IMPORT.md §4a
- [ ] Post-import report: pages/databases imported, plus every auto-grouped
      status option, ambiguous multi-select row, broken relation placeholder,
      toggle→callout conversion, and dropped/fallback block with its warning
- [ ] Hash-based re-upload dedupe: `import_jobs.source_file_hash` +
      `lineage_id` so retries of the same import don't duplicate
      already-committed content, scoped per `org_id`
- [ ] Resumability: a failed or partial import can be retried from the
      `import_jobs` row without duplicating already-imported content

**Done when:** A user can upload a Notion export zip, see their workspace's
pages and databases recreated with the original hierarchy under "Imported from
Notion", and review a post-import report of anything that didn't map cleanly.

---

## Phase 9 — Notion import: AI categorization + review UI ⏳ Planned

**Goal:** After a structural import (Phase 8), optionally re-place imported
pages into the user's *existing* folder structure using AI — but only with
explicit per-page review. This is "Phase B" and is decoupled from Phase 8;
it can ship later without blocking it.

See [`docs/AI_PLACEMENT.md`](AI_PLACEMENT.md) for the model input spec,
batching/cost estimate, and review-UI contract.

- [ ] After a Phase 8 import completes, offer an "Organize with AI" step
- [ ] For each imported page, send title + content excerpt + a workspace
      structure summary to Claude Haiku 4.5 for a placement suggestion
- [ ] Batch requests across pages; cache the shared workspace-structure-summary
      prefix
- [ ] Review UI: every proposed placement is shown to the user before
      anything is applied — accept all, reject all, or override individually
- [ ] Rejected or overridden pages fall back to their Phase 8 structural
      placement (remaining under "Imported from Notion")
- [ ] Applying accepted placements updates `documents.parent_id`, moving pages
      out of the "Imported from Notion" root into their suggested/overridden
      destination
- [ ] Handle failure modes from AI_PLACEMENT.md: API errors, low-confidence
      suggestions, invalid target folders

**Done when:** After an import, a user can run AI categorization, review every
proposed placement in the review UI, accept/reject/override each one
individually, and only then have the placements applied. No AI decision is
ever applied without this review step.

---

## Phase 10 — Notion import: API/OAuth + re-sync ⏳ Planned

**Goal:** Replace the zip-upload entry point with a live Notion connection —
initial import without a file, plus re-sync to pick up later changes. This is
"Phase C", a follow-up once the zip-based pipeline (Phase 8) has proven the
mapping logic in production.

- [ ] Notion OAuth app registration and a "Connect Notion workspace" flow
- [ ] Notion API client: paginate through pages and databases
- [ ] Map Notion API block JSON to our block AST, reusing the mapping table
      from NOTION_IMPORT.md (extended for fields only present via the API)
- [ ] Re-sync: detect changes since the last `import_job` and update existing
      imported pages instead of duplicating them
- [ ] Conflict handling for local edits vs. Notion-side edits to the same page
- [ ] Rate-limit handling / backoff for the Notion API

**Done when:** A user can connect their Notion workspace via OAuth, run an
initial import with no file upload, and re-sync later to pick up changes
without duplicating content.

---

## Deferred (post-Phase 6)

The following are noted but explicitly out of scope until after Phase 6 ships:

- **Inline databases** — a database embedded as a block inside a regular page
  (as opposed to a full-page database). Deferred to keep the routing model simple
  in Phases 3–5.
- **Dashboard views** — aggregate KPIs from multiple databases into a single
  "control panel" view.
- **Database automations** — trigger actions (update property, create row, send
  notification) when property values change.
- **Notion AI-style semantic search across database properties** — currently the
  assistant uses a mock; a real implementation requires an embedding model and
  vector store.
- **Row-level permissions** — grant/revoke access per row; depends on
  multi-tenancy landing first.
- **Employee Documents** — per-employee file uploads (contracts, NDAs, ID
  copies, signed policies) accessible from the employee profile page in the
  Leave Tracker.

  **Status: explicitly deferred.** Not built in the v1 employee profile.

  **Reasoning:** this feature stores heavily sensitive identifying data with
  real compliance weight (POPIA, GDPR, and jurisdiction-dependent regulations).
  It requires encrypted-at-rest file storage, signed download URLs, access
  logging, and granular per-document permissions — none of which exist in the
  current stack.

  **All three of the following must be true before this is built:**
  1. A paying client has specifically requested it.
  2. The bulk image/file storage path from Phase 8 (Notion import) has shipped
     — employee document storage rides on the same underlying primitives and
     there is no point building a second, parallel storage layer before those
     primitives exist.
  3. Phase 7 (multi-tenancy) has shipped — per-org isolation and RLS must be
     in place before any client documents land in the system.

  **When built**, this feature requires its own planning doc covering: retention
  policy, encryption approach, deletion rights (right to erasure under POPIA /
  GDPR), breach response procedure, and a per-document permission model
  (e.g. manager-only vs. HR-only vs. employee-visible).
