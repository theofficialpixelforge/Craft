# Craft Clone

A Craft.do-inspired block-based document editor being extended with
Notion-style databases. Users create hierarchical documents composed of typed
blocks. The app also includes a calendar with event booking, a mock AI
assistant, and a full settings modal.

## Run it

```
cd craft-clone && npm run install:all
npm run dev
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

## Features

- Block-based editor: text, headings, lists, to-dos, code, quotes, callouts,
  dividers, images, tables, columns, and page links
- Document tree with nesting, drag-to-reorder, favorites, emoji, and covers
- Slash command menu, format toolbar, and markdown shortcuts
- Full-text search, backlinks, and markdown export
- Calendar with month/list views and multi-day event booking
- AI assistant panel (mock streaming)
- Settings modal with theming, accent colours, and more
- Local auth (sign-in → name → role; localStorage only)

## Project layout

| Path | Purpose |
|------|---------|
| `server/db/database.js` | sql.js wrapper with better-sqlite3-compatible API; debounced 200 ms file saves |
| `server/index.js` | Express app + route registration |
| `server/routes/` | documents, blocks, search, export, assistant |
| `client/src/types/index.ts` | All shared TypeScript types incl. `BlockType`, `Block`, `Document`, `InlineNode` |
| `client/src/store/` | Zustand stores — documentStore, editorStore, uiStore, searchStore |
| `client/src/components/editor/` | BlockList → Block → BlockRenderer → per-type block components |
| `client/src/api/index.ts` | Typed fetch wrapper; `api.chatStream()` is an async generator over SSE |

## Roadmap

See [`CLAUDE.md`](CLAUDE.md) for full conventions and current status, and
[`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) for the phase-by-phase plan
(databases, multi-tenancy, and Notion import).

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
