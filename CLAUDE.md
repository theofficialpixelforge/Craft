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
| Database | sql.js — SQLite in-memory, file-persisted at `server/db/craft.db` |
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

**Phase 3 (planning):** Database schema foundation. No application code written
yet. See [`docs/DATABASES.md`](docs/DATABASES.md) for the data model design and
all resolved decisions. See [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) for all
phases.

**Phases 7–10 (planning):** Multi-tenancy/Postgres migration, then Notion
import (zip-based structural import, AI categorization with mandatory review,
and a later API/OAuth + re-sync path). No application code written yet. See
[`docs/NOTION_IMPORT.md`](docs/NOTION_IMPORT.md) and
[`docs/AI_PLACEMENT.md`](docs/AI_PLACEMENT.md).

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
- **Auth:** localStorage only (`craft_auth` key). No server-side sessions or
  JWTs. Multi-tenancy is not implemented — see DATABASES.md open questions.
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
| 3 | Database schema foundation (no UI) | 🔄 Planning |
| 4 | Database MVP: properties + table view + filter/sort/group | ⏳ Planned |
| 5 | Additional database views: board, calendar, timeline, gallery, list | ⏳ Planned |
| 6 | Database power tools: relations, rollups, formulas | ⏳ Planned |
| 7 | Multi-tenancy / Postgres migration (org_id, auth, RLS) | ⏳ Planned |
| 8 | Notion import: zip-based, structural placement | ⏳ Planned |
| 9 | Notion import: AI categorization + review UI | ⏳ Planned |
| 10 | Notion import: API/OAuth + re-sync | ⏳ Planned |
