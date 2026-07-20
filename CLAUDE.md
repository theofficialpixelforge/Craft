# CLAUDE.md — Craft Clone

## What this is

A Craft.do-inspired block-based document editor being extended with Notion-style
databases. Users create hierarchical documents composed of typed blocks. The app
also includes a calendar with event booking, a mock AI assistant, and a full
settings modal.

## Run it

```
cd craft-clone && npm run dev
```

| Service | URL |
|---------|-----|
| Client (Vite) | http://localhost:5173 |
| Server (Express) | http://localhost:3001 |

`npm run install:all` installs dependencies for root, server, and client.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite, Tailwind (PostCSS), Zustand, @dnd-kit |
| Backend | Node.js + Express 4 |
| Database | sql.js — SQLite in-memory, file-persisted at `server/db/craft.db` (Phase 7 migrates to Supabase Postgres) |
| Auth | localStorage only today; Phase 7 migrates to Supabase Auth |
| Icons | lucide-react |

## Current status — June 2026

**Phase 1 (done):** Core block editor with 16 block types (including table,
2-column, and 3-column layout blocks), document tree, navigation, slash menu,
format toolbar, search, backlinks, markdown export. Auth: sign-in → name →
role (Manager or Intern only).

**Phase 2 (done):** Calendar with month/list view and multi-day event booking.
Full Leave Tracker: manager dashboard (all employees, leave balances, overtime,
archive) and intern personal view. Daily Updates and Monthly Reports with
role-based dual-mode rendering. AI assistant panel (mock streaming/SSE).
Settings modal with dark/light theme and accent colour. Promo popup.
Employee Profiles (manager-only): two-panel view with identity, leave,
contact, notes, and a deferred documents tab; add/edit/deactivate/reactivate
employees; shares `leave_employees` localStorage key with Leave Tracker.

**Phase 3 (planning):** Database schema foundation. No application code written
yet. See [`docs/DATABASES.md`](docs/DATABASES.md) for the data model design and
all resolved decisions. See [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) for all
phases.

**Phase 7 (🔄 In Progress):** Multi-tenancy + Postgres migration.
**Session 2a complete (2026-06-18):** All 16 Postgres tables created in Supabase
with RLS on every table.
**Session 2b complete (2026-07-14):** Full cutover to Supabase Postgres and
Supabase Auth. sql.js and localStorage auth removed from startup path (files
kept for rollback). New auth flow: sign up → create org → app. All Express
routes now require JWT and scope queries by `org_id`.
**Session 2c is next:** Invite code generation, invite validation, and the
Organization Settings page so managers can bring interns into their org.
See [`docs/MULTITENANCY.md`](docs/MULTITENANCY.md) for the full spec. Five
decisions are locked (see MULTITENANCY.md §0):
- Multi-tenancy and Postgres happen in the same phase. RLS is non-negotiable.
- Invite flow uses invite codes for v1 (no email infrastructure).
- One org per user in v1; memberships table supports multi-org for later.
- Managers create their org at first sign-up; interns enter via invite code.
- Sign-in role picker is removed; role comes from `memberships.role`.

**Phases 8–10 (planning):** Notion import (zip-based structural import, AI
categorization with mandatory review, and a later API/OAuth + re-sync path).
Blocked on Phase 7 completing. See [`docs/NOTION_IMPORT.md`](docs/NOTION_IMPORT.md)
and [`docs/AI_PLACEMENT.md`](docs/AI_PLACEMENT.md).

**Phases 3–6 (deferred):** Database schema foundation through power tools.
These phases are planned but not implemented. Since Phase 7 runs first, all
Phase 3–6 tables will be built on Postgres (not sql.js). The SQLite DDL in
`docs/DATABASES.md` is a design reference only — it will be translated to
Postgres types when Phase 3 is implemented.

**Deployed:** Live on Netlify via GitHub (https://github.com/theofficialpixelforge/Craft).
`client/_redirects` handles SPA routing.

## Key files

| Path | Purpose |
|------|---------|
| `server/db/database.js` | sql.js wrapper with better-sqlite3-compatible API; debounced 200 ms file saves |
| `server/index.js` | Express app + route registration |
| `server/routes/` | documents, blocks, search, export, assistant |
| `client/src/types/index.ts` | All shared TypeScript types incl. `BlockType`, `Block`, `Document`, `InlineNode` |
| `client/src/store/` | Zustand stores — documentStore, editorStore, uiStore, searchStore |
| `client/src/components/editor/` | BlockList → Block → BlockRenderer → per-type block components |
| `client/src/api/index.ts` | Typed fetch wrapper; `api.chatStream()` is an async generator over SSE |

## Conventions

- **Styling:** Inline styles throughout, CSS variables for theme tokens
  (`var(--bg-app)`, `var(--bg-editor)`, `var(--accent)`, `var(--border)`,
  `var(--text-primary/secondary/tertiary)`). No CSS modules or Tailwind classes
  at runtime (Tailwind is only used for the PostCSS pipeline).
- **Optimistic updates:** `editorStore` applies block changes immediately and
  reverts by refetching if the API call fails.
- **Block content:** `blocks.content` stores `InlineNode[]` as JSON text.
  Parsed by the export route server-side; rendered by `renderInlineNodes` in
  `client/src/utils/inlineNodes.ts` client-side.
- **DB persistence:** sql.js exports the in-memory DB to disk 200 ms after any
  write. The file is read back on server start.
- **Auth:** localStorage only (`craft_auth` key) today. No server-side sessions
  or JWTs yet. Phase 7 migrates to Supabase Auth. Multi-tenancy planning is
  complete — see [`docs/MULTITENANCY.md`](docs/MULTITENANCY.md).
- **ID generation:** server uses the `uuid` npm package (`v4`); client also uses
  `uuid` for optimistic block IDs.
- **Error handling:** API errors surface as thrown `Error` objects. Stores catch
  and expose an `error: string | null` field. No global error boundary in the
  React tree yet.

## Roadmap summary

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Core block editor, documents, navigation | ✅ Done |
| 2 | Calendar, assistant, settings, themes | ✅ Done |
| 7 | Multi-tenancy / Postgres migration (org_id, Supabase Auth, RLS, invites) | 🔄 In Progress |
| 3 | Database schema foundation (no UI) — will build on Postgres | ⏳ Planned (post-7) |
| 4 | Database MVP: properties + table view + filter/sort/group | ⏳ Planned (post-7) |
| 5 | Additional database views: board, calendar, timeline, gallery, list | ⏳ Planned (post-7) |
| 6 | Database power tools: relations, rollups, formulas | ⏳ Planned (post-7) |
| 8 | Notion import: zip-based, structural placement | ⏳ Planned (post-7) |
| 9 | Notion import: AI categorization + review UI | ⏳ Planned (post-7) |
| 10 | Notion import: API/OAuth + re-sync | ⏳ Planned (post-7) |
