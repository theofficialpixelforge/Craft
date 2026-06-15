# DATABASES.md — Data model design

This document covers the schema design for Notion-style databases. It is a
planning artefact — no application code exists yet. We will implement Phase 3
only after this document is reviewed and the open questions are answered.

---

## 1. Core concept

Every database row is a full document/page in our existing editor. This is the
non-obvious design point that separates Notion databases from spreadsheets: the
table cell is a summary; opening the row opens the same block editor the user
already uses everywhere else. There is no separate "row content" model — the
row's rich content is just blocks, exactly as today.

---

## 2. Tables / collections needed

### 2a. New tables

#### `databases`

One record per database container.

```sql
CREATE TABLE IF NOT EXISTS databases (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT 'Untitled',
  icon        TEXT,            -- emoji or null
  cover_url   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### `db_properties`

Column definitions for a database. One record per column.

```sql
CREATE TABLE IF NOT EXISTS db_properties (
  id           TEXT PRIMARY KEY,
  database_id  TEXT NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL,
  -- type values: text | number | select | multi_select | status | date |
  --   checkbox | url | email | phone | created_time | last_edited_time |
  --   created_by | last_edited_by | relation | rollup | formula | person | files
  config       TEXT NOT NULL DEFAULT '{}',
  -- JSON payload, shape varies by type:
  --   select/multi_select: { options: [{ id, name, color }] }
  --   status: { groups: [{ id, name, color, optionIds[] }], options: [...] }
  --   number: { format: 'plain' | 'dollar' | 'percent' | 'comma' }
  --   date: { includeTime: bool }
  --   relation: { target_database_id, back_property_id }
  --   rollup: { relation_property_id, target_property_id, aggregation }
  --   formula: { expression: string }
  position     REAL NOT NULL DEFAULT 0,
  is_primary   INTEGER NOT NULL DEFAULT 0,  -- exactly one per database (Title)
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Constraint: exactly one `is_primary = 1` row per `database_id`. Enforced at the
application layer (not a SQL constraint, since SQLite's partial unique index
support is limited in sql.js).

#### `db_property_values`

One record per (document × property) pair. The title property is NOT stored
here — it maps directly to `documents.title`.

```sql
CREATE TABLE IF NOT EXISTS db_property_values (
  id           TEXT PRIMARY KEY,
  document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  property_id  TEXT NOT NULL REFERENCES db_properties(id) ON DELETE CASCADE,
  value        TEXT NOT NULL DEFAULT 'null',
  -- JSON-encoded typed value, shape varies by type:
  --   text:         "\"hello\""
  --   number:       "42"
  --   checkbox:     "true"
  --   select:       "\"option-id\""
  --   multi_select: "[\"opt-id-1\",\"opt-id-2\"]"
  --   status:       "\"option-id\""
  --   date:         "{\"start\":\"2026-05-14\",\"end\":null,\"includeTime\":false}"
  --   url/email/phone: "\"https://...\""
  --   files:        "[{\"name\":\"file.pdf\",\"url\":\"...\"}]"
  --   relation:     "[\"doc-id-1\",\"doc-id-2\"]"   (document IDs)
  --   rollup/formula: computed at read time, not stored
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (document_id, property_id)
);
```

Auto-populated properties (`created_time`, `last_edited_time`, `created_by`,
`last_edited_by`) are derived from `documents.created_at`, `documents.updated_at`,
and auth context at read time — they have no rows in this table.

Rollup and formula values are computed server-side on each read. They are not
persisted in `db_property_values` (avoids stale cache problems at this scale).

#### `db_views`

View configurations. One record per named view of a database.

```sql
CREATE TABLE IF NOT EXISTS db_views (
  id           TEXT PRIMARY KEY,
  database_id  TEXT NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Default View',
  type         TEXT NOT NULL DEFAULT 'table',
  -- type values: table | board | list | gallery | calendar | timeline
  config       TEXT NOT NULL DEFAULT '{}',
  -- JSON payload:
  -- {
  --   visibleProperties: string[],    -- property IDs; order = column order
  --   filters: FilterRule[],
  --   sorts: SortRule[],
  --   groupBy: string | null,         -- property ID
  --   conditionalColors: ColorRule[]
  -- }
  --
  -- FilterRule: { propertyId, operator, value }
  -- SortRule:   { propertyId, direction: 'asc' | 'desc' }
  -- ColorRule:  { conditions: FilterRule[], color: string }
  position     REAL NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 2b. Migrations to existing tables

Two columns are added to `documents`. Both use the existing migration pattern
(try `ALTER TABLE … ADD COLUMN`, catch the "duplicate column" error).

```sql
ALTER TABLE documents ADD COLUMN doc_type  TEXT NOT NULL DEFAULT 'page';
-- values: 'page' | 'db_row'

ALTER TABLE documents ADD COLUMN database_id TEXT;
-- non-null only when doc_type = 'db_row'; references databases(id)
```

No change to `blocks`, `backlinks`, or any existing column.

---

## 3. Org scoping (org_id / RLS)

**Recommendation: do not add `org_id` columns or RLS in Phases 3–6.**

The current app is single-user. Authentication is localStorage-only. The backend
is sql.js — a single in-memory SQLite file. There is no concept of an
organisation, workspace, or user record on the server. Adding `org_id` columns
now would be dead weight: nothing reads or enforces them, and they create false
confidence that multi-tenancy is handled.

When multi-tenancy is eventually planned, the infrastructure changes will be
fundamental:
- Migrate from sql.js to a server-side database (PostgreSQL is the natural
  target; it has native RLS and the `uuid-ossp` extension).
- Add a `users` table and JWT / session-based auth.
- Add an `orgs` (or `workspaces`) table with membership.
- Add `org_id` to every table and enable Row-Level Security policies.

That is an infrastructure phase that will touch every table and every route.
It makes no sense to partially do it now. Document the future intent here and
defer.

**Decision (Q1):** Multi-tenancy is not planned before databases ship. Proceed
as-is with sql.js and localStorage auth. No `org_id` columns. No RLS.
Multi-tenancy is a post-Phase 6 infrastructure phase; it will be planned
separately when the time comes.

---

## 4. How a row's page content connects to the document model

### The question

When a user opens a database row, they see a full block editor. Should this be:

- **Option A — Unified:** the row *is* a document. The row's blocks live in the
  `blocks` table under `blocks.document_id`. The row's page title is
  `documents.title`. There is one model.
- **Option B — Two models linked:** rows have their own content table, and
  documents remain a separate concept linked by a foreign key.

### Recommendation: Option A — one unified model

A database row is a document. Specifically, it is a document with
`doc_type = 'db_row'` and a non-null `database_id`. Everything else is the same:
it has a title, it has blocks, it can have child pages, it can be opened in the
block editor.

**Why this is right:**

1. **Zero duplication.** The block editor, `editorStore`, all existing block
   components, and the export route work identically for db_row documents. There
   is no parallel "row content" system to build, test, or maintain.

2. **Consistent navigation.** The document tree, search, and backlinks already
   work. A db_row document appears in search results. A link block can point to a
   db_row. This is coherent by default, not by special-casing.

3. **Simpler mental model.** For users: "every item in a database is a page, just
   like any other page." For developers: there is one content API, one block
   renderer, one export path.

4. **Precedent.** This is exactly how Notion works. It is also the model
   explicitly described in the feature brief.

**The only cost of Option A:** the `documents` table grows two new nullable
columns (`doc_type`, `database_id`). Existing queries that fetch documents
should filter on `doc_type = 'page'` or `doc_type != 'db_row'` where
appropriate (e.g. the document tree in the sidebar should not show db_rows as
top-level pages).

**Practical rules:**

| Context | Filter |
|---------|--------|
| Sidebar document tree | `doc_type IN ('page', 'database_container')` |
| Search results | include `db_row` documents (surfaced with database context) |
| "Page" block picker | include `db_row` documents |
| Backlinks | include `db_row` documents |
| Database row list | `doc_type = 'db_row' AND database_id = ?` |
| Markdown export | works for any doc_type |

**Decision (Q2):** db_row documents do **not** appear in the sidebar document
tree. They are visible only inside database views. `db_row.parent_id` is set to
null. The sidebar tree filters to `doc_type IN ('page', 'database_container')`.

---

## 5. Where databases live in the navigation

A database is a top-level entity. It is not a document, but it behaves like one
for navigation purposes. Two options:

**Option A — Databases appear in a dedicated "Databases" sidebar section.**
Clean separation. Databases are never confused with regular pages.

**Option B — Databases appear in the document tree as a special node type.**
Familiar pattern (Notion does this). Requires the sidebar to render a different
icon and route for database nodes.

**Decision (Q3): Option B — databases appear in the document tree.**
Reuses the existing sidebar tree component with a minimal addition (database
icon, different `onClick` routing to `DatabaseView`).

**Decision (Q3 cont.):** A database container is represented as a `documents`
row with `doc_type = 'database_container'`. This inherits `parent_id`,
`position`, emoji, cover, and the full sidebar tree component for free. The
`databases` table holds a `document_id` FK pointing back to this container
document. The container document has no blocks — navigating to it renders
`DatabaseView` instead of `DocumentEditor`.

`doc_type` now has three values: `'page'` | `'database_container'` | `'db_row'`.

---

## 6. The `database` block type (inline databases — deferred)

**Decision (Q4): Inline databases are deferred post-Phase 6.**

For Phases 4–6, databases are full-page only. The `database` block type is
added to the slash menu in Phase 4, but inserting it creates a full-page
database and navigates there rather than rendering inline. The block's
`linked_db_id` field is reserved for future inline support.

Rationale: inline databases require the block renderer to host a complete
database view (with views, filters, and state) inside the editor scroll
container. This is a substantial routing and state management change that is
not needed for the core feature to ship.

---

## 7. Summary of all tables after Phase 3

`doc_type` gains a third value: `'database_container'` (for the sidebar node
that represents a database).

| Table | Phase 3 change | Notes |
|-------|----------------|-------|
| `documents` | modified | +`doc_type TEXT DEFAULT 'page'`, +`database_id TEXT` |
| `blocks` | unchanged | |
| `backlinks` | unchanged | |
| `databases` | **new** | metadata; +`document_id` FK to the container document |
| `db_properties` | **new** | column definitions per database |
| `db_property_values` | **new** | JSON-encoded typed value per (document × property) |
| `db_views` | **new** | view type + JSON config (visible props, filters, sorts, groupBy) |

---

## 8. Decisions — all questions resolved

All five open questions are now closed. Phase 3 implementation may begin.

| # | Question | Decision |
|---|----------|----------|
| 1 | Multi-tenancy before databases? | **No.** Proceed as-is with sql.js. Multi-tenancy is a post-Phase 6 infrastructure phase (Postgres, proper auth, RLS). No plan revision needed. |
| 2 | db_row documents in sidebar? | **No.** db_rows are visible only inside database views. Sidebar tree filters to `doc_type IN ('page', 'database_container')`. |
| 3 | Database container representation? | **`doc_type = 'database_container'` in `documents`.** Reuses `parent_id`, `position`, emoji, cover, and sidebar tree component. `databases.document_id` FK points back to the container. |
| 4 | Inline databases scope? | **Deferred post-Phase 6.** The `/database` slash command creates a full-page database and navigates there. Inline rendering is reserved via `linked_db_id` but not implemented until after Phase 6. |
| 5 | Rollup/formula evaluation? | **Compute at read time.** At sql.js/single-user scale there is no perf cost. Materialisation adds cache invalidation complexity for no practical benefit. Revisit when moving to Postgres. |
