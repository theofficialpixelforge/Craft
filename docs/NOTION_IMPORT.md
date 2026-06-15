# NOTION_IMPORT.md — Notion zip import (Phase 8 / "Phase A")

This document is the planning artefact for Phase 8 (see
[`docs/BUILD_PLAN.md`](BUILD_PLAN.md)). It covers: the block mapping table, the
database (CSV) mapping, the import pipeline data flow, and where import fits in
the org-scoped data model. No application code, parsers, or migrations exist
yet — this is the spec those will be built against.

---

## 0. Why the zip export, not the API

Notion's "Export → Markdown & CSV" produces a `.zip` containing one `.md` file
per page (nested in folders matching the page hierarchy), one `.csv` per
database, and an attachments folder (or inline asset subfolders, depending on
export settings) for images and files.

This path works immediately for any client with zero auth setup, no API rate
limits, and no OAuth approval process. The Markdown/CSV format is messier than
the API's block JSON — it loses some structure (synced blocks, some embed
types, formula/rollup expressions) — but building a robust mapping layer for
the *worse* format makes the API-based path (Phase 10 / "Phase C") strictly
easier later: the API gives strictly more structure than the export, so the
same mapping table applies with fewer fallbacks.

---

## 1. Block mapping table

This is the most important artefact in this document. Every row is a decision:
**direct** (maps cleanly to an existing block type), **fallback** (maps to
something close, with a logged warning so the user knows it wasn't exact), or
**drop** (block is discarded, always with a logged warning — nothing
disappears silently).

Our current block types (from `client/src/types/index.ts`): `text`, `h1`,
`h2`, `h3`, `bullet`, `numbered`, `todo`, `code`, `quote`, `divider`,
`callout`, `image`, `page`, `table`, `columns2`, `columns3`.

| Notion block type | Decision | Maps to | Notes |
|---|---|---|---|
| Paragraph | **Direct** | `text` | — |
| Heading 1 / 2 / 3 | **Direct** | `h1` / `h2` / `h3` | Notion also has "toggleable headings" — the toggle behaviour is dropped (see Toggle row), heading level is preserved |
| Bulleted list item | **Direct** | `bullet` | Nesting depth → `indent` |
| Numbered list item | **Direct** | `numbered` | Notion restarts numbering per list; we recompute position-based numbering, so restart points are not preserved — **warning logged** |
| To-do | **Direct** | `todo` | `checked` state preserved from Markdown `[x]`/`[ ]` |
| Quote | **Direct** | `quote` | — |
| Divider | **Direct** | `divider` | — |
| Callout | **Direct** | `callout` | `callout_icon` set from the emoji if Notion's icon is an emoji; if it's a custom image icon, default to 💡 and **log a warning** |
| Code | **Direct** | `code` | `language` mapped to the closest value in our language list; unrecognized Notion languages (e.g. `mermaid`, `r`, `webassembly`) fall back to `plaintext` with a **warning** |
| Image | **Direct** | `image` | File copied from the export's attachments folder into app storage; `image_url` rewritten to the new location; caption → `image_caption` |
| Simple table | **Direct** | `table` | See §1a — cell rich-text formatting is **not** preserved (our `TableData.rows` is `string[][]`); **warning logged**: "table formatting flattened to plain text" |
| Column list (2 columns) | **Direct, conditional** | `columns2` | Only when each column contains a single text-like block (paragraph/heading/quote). See §1a |
| Column list (3 columns) | **Direct, conditional** | `columns3` | Same condition as above |
| Column list (1, 4+, or complex columns) | **Fallback** | sequential `text`/etc. blocks | Columns flattened in left-to-right, top-to-bottom order; **warning logged**: "column layout not preserved, content flattened" |
| Child page | **Direct** | new `documents` row + `page` block | Drives the hierarchy — see §3 |
| Child database (inline or full-page) | **Direct** | `databases` row + container document | See §2 |
| Link to page (in-workspace) | **Direct, conditional** | `page` block, `linked_doc_id` set | Only if the target page is also part of this import and has already been (or will be) created; otherwise **fallback** to a `text` block containing the link text as a hyperlink, **warning logged**: "link target not found in import" |
| Toggle list | **Fallback** | `callout` wrapping flattened `bullet` children | The toggle's children become nested bullets at `indent + 1`, wrapped inside a `callout` block (icon: 📦, text: "Was a toggle in Notion — shown expanded below"). The callout preserves the *intent* that this content was collapsible, even though the collapse behaviour itself is lost. **Warning logged**: "toggle expanded into a callout — collapse state not preserved" |
| Toggleable heading | **Fallback (heading direct, children wrapped)** | `h1`/`h2`/`h3` (direct) + a `callout`-wrapped block of flattened children below it | The heading itself maps directly. Its previously-collapsed children are flattened and wrapped in the same "Was a toggle in Notion" callout as the Toggle list row. **Warning logged** |
| Synced block | **Fallback** | plain blocks at every occurrence | Content is imported normally at the *original* block's location; every block that *references* the synced block gets its own independent copy of the content at import time. **Warning logged** at each reference: "synced block imported as independent copy — future edits will not stay in sync" |
| Video | **Fallback** | `text` with a link | Block becomes a text block whose content is a hyperlink to the copied attachment (or original URL if external). **Warning logged**: "video block imported as link" |
| Audio | **Fallback** | `text` with a link | Same as Video. **Warning logged** |
| File / PDF attachment block | **Fallback** | `text` with a link | File copied into app storage, linked. **Warning logged**: "file attachment imported as link" |
| Bookmark | **Fallback** | `text` with a link | We have no native bookmark/link-preview block. **Warning logged**: "bookmark imported as plain link" |
| Link Preview | **Fallback** | `text` with a link | Same as Bookmark |
| Generic embed (iframe-style: Figma, Tweet, etc.) | **Fallback** | `text` with a link | Embeds are not interactive after import. **Warning logged**: "embed imported as link, not rendered inline" |
| Equation (block) | **Fallback** | `code` block, `language: 'plaintext'` | LaTeX source preserved as text inside a code block. **Warning logged**: "equation imported as raw LaTeX text" |
| Table of contents | **Drop** | — | Auto-generated from headings; redundant in our editor. **Warning logged**: "table of contents block dropped (auto-generated)" |
| Breadcrumb | **Drop** | — | Navigation artifact tied to Notion's UI. **Warning logged**: "breadcrumb block dropped" |
| Template button | **Drop** | — | No equivalent (creates pre-filled child pages on click). **Warning logged**: "template button dropped — no equivalent" |
| Mention: page | **Direct, conditional** | inline link node | Resolvable the same way as "Link to page"; unresolvable mentions become plain text of the mentioned page's title, **warning logged** |
| Mention: user | **Fallback** | plain text | Renders the mentioned person's display name as plain text (no user model to link to). **Warning logged**: "user mention imported as plain text" |
| Mention: date | **Direct** | plain text | Renders the date string as plain text — no special date-mention node exists, but this is lossless for reading |
| Mention: database | **Direct, conditional** | inline link to the database's container document, if imported in this batch; otherwise plain text | Same resolution logic as page links |

### 1a. Why "conditional" for tables and columns

- **`table`**: `TableData` is `{ hasHeader: boolean, rows: string[][] }` — plain
  strings only. A Notion simple table with bold/links/colors inside cells maps
  *directly* in structure (rows × columns) but **loses inline formatting**,
  which is why this row is marked direct-but-flagged rather than a clean
  direct map. (Note: Notion's *database*-as-inline-table is a different thing
  — see §2, it goes through the CSV/database mapping, not this row.)
- **`columns2` / `columns3`**: `columns_data` is `InlineNode[][]` — i.e. each
  column holds *one* run of rich inline content, not a list of blocks. Notion
  columns can contain arbitrary nested blocks (multiple paragraphs, lists,
  images, etc.) per column. We only take the direct path when every column's
  content collapses to a single text-like block; anything richer falls back to
  flattening (see the "complex columns" row above).

---

## 2. Database (CSV) mapping

Each Notion database exports as one `.csv` file (rows) alongside the page
hierarchy. Columns map to `db_properties` per the type table in
[`docs/DATABASES.md`](DATABASES.md) §2a.

| Notion property type | Decision | Maps to (`db_properties.type`) | Round-trips cleanly? | Notes |
|---|---|---|---|---|
| Title | **Direct** | `documents.title` (not a `db_properties` row) | Yes | Per DATABASES.md, the title is not a property row |
| Text | **Direct** | `text` | Yes | — |
| Number | **Direct** | `number` | Mostly | CSV stores numbers as locale-formatted strings (`"1,234.5"`); needs locale-aware reparsing. Number *format* (dollar/percent/etc.) is not exported by Notion's CSV, so all imported number properties default to `format: 'plain'`. **No** — format choice does not round-trip |
| Select | **Direct** | `select` | Mostly | CSV gives the option's name only, no color. New `select` options are created with arbitrary colors from our palette. **No** — color does not round-trip |
| Multi-select | **Direct** | `multi_select` | Mostly | CSV cell is a comma-separated list of option names. Option names containing commas are ambiguous and may misparse — **accepted for the zip path** (see §5a); affected rows are listed in the post-import report. Colors don't round-trip, same as Select |
| Status | **Direct** | `status` | Partially | CSV gives the status option's name, not its group. New options **default to the "To Do" group**; every auto-grouped option is listed in the post-import report so the user can re-group manually |
| Date | **Direct** | `date` | Mostly | Notion CSV dates are strings like `May 14, 2026` or `May 14, 2026 → May 20, 2026` (ranges) or with a time component. Needs a permissive date-range parser; `includeTime` inferred from whether a time is present |
| Checkbox | **Direct** | `checkbox` | Yes | CSV value is `"Yes"`/`"No"` |
| URL / Email / Phone | **Direct** | `url` / `email` / `phone` | Yes | Plain string passthrough |
| Files & media | **Direct** | `files` | Yes | CSV gives filenames; actual file bytes come from the zip's attachment folders, matched by filename |
| Person | **Direct** | `person` | Yes (already lossy by design) | DATABASES.md already specifies `person` as free text until multi-user exists, so a CSV name string is a clean fit — no new loss introduced by import |
| ID | **Direct** | `text` | Yes (as static text) | Notion's auto-incrementing ID column has no equivalent concept; imported as a plain text property with its existing values frozen |
| Created time | **Direct** | maps to `documents.created_at` at insert time | Yes | Resolved: Phase 7's bulk-insert path accepts explicit historical timestamps (see §4), so the CSV's "Created time" value is preserved as-is |
| Last edited time | **Direct** | maps to `documents.updated_at` at insert time | Yes | Same as Created time — set via the Phase 7 bulk-insert path |
| Created by | **Fallback** | `text`, value = the name string from the CSV, frozen | **No** | We have no user model to attribute to (consistent with `person` being free text). **Warning logged**: "Created by imported as static text — not a live user reference" |
| Last edited by | **Fallback** | `text`, frozen | **No** | Same as Created by |
| Relation | **Fallback (best-effort)** | `relation`-typed property, populated via title matching | Partially | CSV gives a list of related rows' *titles* (not IDs). We resolve each title to a document ID by matching against pages imported in this same job. Unmatched titles become **broken relation placeholders** (the original title is retained as text rather than dropped) — see §4a. Every broken placeholder is listed in the post-import report |
| Rollup | **Fallback** | `text`, value = the computed string Notion had at export time, frozen | **No** | The rollup's relation/aggregation config is not exported. **Warning logged**: "rollup value frozen at import time; live aggregation not preserved" |
| Formula | **Fallback** | `text`, value = the computed value at export time, frozen | **No** | Same reasoning as Rollup. **Warning logged**: "formula expression lost; value frozen at import time" |

---

## 3. Import pipeline data flow

```
zip upload → unpack → parse → map → stage → user review → commit
```

| Stage | Responsibility |
|---|---|
| **Zip upload** | User selects a `.zip` via Settings → Import. Server stores it to a temp location and creates an `import_jobs` row (`status: 'uploaded'`, `org_id` from the session). |
| **Unpack** | Extract the zip to a temp working directory. `status: 'unpacking'`. Validate it looks like a Notion export (presence of `.md`/`.csv` files); fail fast with a clear error if not. |
| **Parse** | Walk the extracted directory tree. For each `.md` file: parse front matter + Markdown body into an intermediate AST. For each `.csv`: parse as a database (header row → properties, data rows → row values). Build an in-memory tree reflecting folder nesting → page hierarchy, using Notion's `<title> <32-char-hash>.md`/`.csv` naming convention to deduplicate titles and resolve internal links. `status: 'parsing'`. |
| **Map** | Apply the block mapping table (§1) to convert each parsed page's AST into our `Block[]` shape, and the database mapping table (§2) to convert each CSV into `databases`/`db_properties`/`db_property_values` rows. Every fallback or drop decision — including auto-grouped status options, multi-select parse ambiguities, and broken relation placeholders (§4a) — appends an entry to a `warnings[]` list (page/database, block type, decision, message). `status: 'mapped'`. |
| **Stage** | Persist the mapped result (documents tree, blocks, databases, warnings, attachment manifest) into `import_jobs.staged_data` (JSON) without touching the live `documents`/`blocks`/`databases` tables. `status: 'staged'`. |
| **User review** | The user sees a **post-import report**: the page/folder tree about to be created (rooted under "Imported from Notion", §3a), the list of databases and their property mappings, and the full warnings list (auto-grouped statuses, ambiguous multi-select rows, broken relation placeholders, toggle→callout conversions, dropped/fallback blocks). Phase 8 review is **informational** — it confirms *what* will be created, not *where* (no AI placement yet; that's Phase 9). User can cancel or confirm. `status: 'awaiting_review'`. |
| **Commit** | On confirm, insert everything into `documents`, `blocks`, `databases`, `db_properties`, `db_property_values` inside a transaction, all rows tagged with the job's `org_id`, using the Phase 7 bulk-insert path so `created_at`/`updated_at` can be set from the CSV's "Created time"/"Last edited time" values. Every page nests under the job's "Imported from Notion" root (§3a). Attachments are copied via the dedicated bulk image upload path (§3b). On success: `status: 'completed'`, `staged_data` cleared, post-import report persisted via `counts`/`warnings`. On failure: `status: 'failed'` with an error detail; the job can be retried from `staged_data` without re-parsing. |

---

## 3a. The "Imported from Notion" root

Every Phase 8 import creates its content under a single new top-level page
titled **"Imported from Notion"** (created once per import job — see §4 for
how repeat uploads relate to each other via lineage). The entire imported
hierarchy — pages, child pages, and database containers — becomes children of
this root. Phase 8 **never** merges into the user's existing sidebar tree.

This keeps a freshly imported workspace clearly separated and reviewable, and
gives Phase 9 a well-defined starting point: AI categorization (Phase 9) reads
pages out of this root and proposes moving them elsewhere; anything the user
rejects or never runs Phase 9 on simply stays under "Imported from Notion"
permanently, which is itself a perfectly usable outcome.

---

## 3b. Bulk image/attachment upload

Phase 8 needs a **dedicated bulk attachment upload path**, separate from the
existing UI-driven image upload route (which is coupled to a single
authenticated user performing one upload via the editor). The import path:

- Shares the same underlying storage location and filename/URL conventions as
  the existing image upload, so `image_url` values and `files` property
  values produced by import are indistinguishable from normal uploads to the
  rest of the app.
- Is invoked server-side, in bulk, during the Commit stage — copying every
  attachment referenced by the parsed pages/databases out of the unpacked zip
  and into storage, then rewriting the corresponding `image_url`/`files`
  references in the staged data before insert.
- Does **not** reuse the existing HTTP upload route; it's a server-internal
  function called directly by the import pipeline.

---

## 4. Org scoping and `import_job` model

Imports are scoped to `org_id` (per Phase 7 — the multi-tenancy migration that
precedes this phase). Every import is recorded as a row in a new `import_jobs`
table:

```sql
CREATE TABLE IF NOT EXISTS import_jobs (
  id                TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL REFERENCES orgs(id),
  source_filename   TEXT NOT NULL,
  source_file_hash  TEXT NOT NULL,
  -- hash of the uploaded zip's contents, used for re-upload dedupe
  lineage_id        TEXT NOT NULL,
  -- groups this job with any prior jobs that are retries/re-uploads of the
  -- same original import; new imports get a fresh lineage_id (= their own id)
  status            TEXT NOT NULL DEFAULT 'uploaded',
  -- status: uploaded | unpacking | parsing | mapped | staged |
  --         awaiting_review | committing | completed | failed
  root_document_id  TEXT,
  -- the "Imported from Notion" page created for this lineage (§3a)
  counts            TEXT NOT NULL DEFAULT '{}',
  -- JSON: { pages: N, databases: N, warnings: N }
  warnings          TEXT NOT NULL DEFAULT '[]',
  -- JSON array: [{ page, blockType, decision, message }]
  staged_data       TEXT,
  -- JSON; cleared after successful commit
  error             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
```

This gives every import an audit trail (who imported what, when, with what
warnings) and makes failed imports resumable from the last completed stage
without re-uploading or re-parsing.

**Re-upload dedupe (lineage):** when a new import's `source_file_hash` matches
a prior job's, the new job reuses that prior job's `lineage_id` and
`root_document_id` — files/pages already committed under that lineage are not
re-created, so a retry of a failed or partial import doesn't duplicate
already-imported content. A different org, or a different file hash, always
gets its own lineage and its own "Imported from Notion" root — unrelated
users importing similar Notion content never collide.

---

## 4a. Broken relation placeholders

`db_property_values` for a `relation` property normally stores a JSON array
of document IDs (per DATABASES.md): `["doc-id-1","doc-id-2"]`. When a CSV
`Relation` cell references a title that doesn't resolve to any page in this
import, the unresolved reference is **not dropped** — it's kept as a
placeholder object inside the same array, e.g.:

```json
["doc-id-1", { "_broken": true, "title": "Q3 Roadmap (not found)" }]
```

The relation cell renderer (added in Phase 6) needs to recognize `_broken`
entries and display them as plain, non-clickable text (the original title)
rather than a linked-row chip — see the follow-up question in §5. Every
broken placeholder created during an import is also listed in the post-import
report so the user can manually fix or re-link it later.

---

## 4b. Multi-select CSV ambiguity — why Phase 10 fixes this cleanly

The comma-delimiter ambiguity in §2's Multi-select row is a direct consequence
of the CSV export format: Notion's CSV flattens a multi-select cell's option
list into a single comma-joined string, with no escaping for option names that
themselves contain commas. The Notion **API**, by contrast, returns multi-select
values as a proper JSON array of `{ id, name, color }` objects — no delimiter,
no ambiguity, and colors round-trip too. This is one of the strongest concrete
arguments for Phase 10 (API/OAuth path): it doesn't just add re-sync, it
resolves a class of mapping problems that the zip path can only ever
work around.

---

## 5. Open questions

The previous round of open questions has been resolved (defaults: Status
options → "To Do" group; historical timestamps via Phase 7's bulk-insert path;
"Imported from Notion" root, always; broken relation placeholders instead of
drops; multi-select comma ambiguity accepted; toggles wrapped in callouts;
dedicated bulk image upload path; hash/lineage-based re-upload dedupe). These
answers raise a few new follow-ups for Phase 7/8 implementation:

1. **Relation cell UI vs. broken placeholders.** Phase 6 (relations/rollups)
   ships before Phase 8 runs, so by the time imports happen the relation cell
   renderer already exists. Does it need a Phase 8-driven update to handle
   `_broken` placeholder entries (§4a), or should that rendering support be
   built as part of Phase 6 itself so it's not a surprise retrofit later?
2. **Lineage matching scope.** §4 ties re-upload dedupe to `source_file_hash`
   + `org_id`. Is file-hash equality sufficient to call two uploads "the same
   import" (e.g. a user re-exports from Notion with one page edited — new
   hash, same intent), or should lineage instead be something the user
   explicitly confirms ("this is a retry/update of import X") rather than
   inferred purely from a hash match?
3. **"Imported from Notion" root naming for multiple imports.** If a user
   runs Phase 8 more than once (different lineages — e.g. importing two
   different Notion workspaces, or the same workspace months apart), each
   gets its own root per §3a/§4. Should these be disambiguated automatically
   (e.g. "Imported from Notion (2026-06-15)"), or is a flat list of
   identically-named "Imported from Notion" pages acceptable?
