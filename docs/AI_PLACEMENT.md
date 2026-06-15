# AI_PLACEMENT.md — AI categorization (Phase 9 / "Phase B")

Planning artefact only — no code, prompts, or API integration exist yet. This
covers Phase 9 of [`docs/BUILD_PLAN.md`](BUILD_PLAN.md): after a Phase 8
(structural) import, optionally re-place imported pages into the user's
*existing* workspace folders using AI, with mandatory per-page review.

**Starting point:** every page Phase 9 considers starts out as a child of the
"Imported from Notion" root created by Phase 8 (see
[`docs/NOTION_IMPORT.md`](NOTION_IMPORT.md) §3a). Phase 9 proposes moving pages
*out* of this root into the user's existing folders. A page that is rejected,
overridden to "leave where it is", or never reviewed at all simply stays under
"Imported from Notion" — that is a complete, usable end state, not a
half-finished one.

**Scope reminder:** this is "(1) Categorization" only — placing imported pages
into folders the user already has. "(3) Restructuring" (AI proposing a new
organization for a flat pile of pages) is out of scope, deferred indefinitely.

---

## 1. What gets sent to the model, per page

For each imported page, one classification request needs:

| Input | Size (approx.) | Notes |
|---|---|---|
| Page title | ~10 tokens | From the imported document's title |
| Content excerpt | ~300 tokens | First N tokens of the page's rendered text content (heading + first few blocks), enough for the model to infer topic without sending the whole page |
| Workspace structure summary | ~1,500–2,500 tokens | A flat or shallow-tree listing of the user's *existing* top-level folders/pages (title + one-line description each, derived from the page's first heading/paragraph or emoji+title). Shared across every page in the batch — this is the cache candidate. |
| Per-page instruction overhead | ~50 tokens | Output format instructions, the specific question ("which existing folder, if any, fits this page best?") |

Expected model output per page: a small JSON object — target folder ID (or
`null` for "no good match, leave at original Phase 8 location"), a confidence
score, and a one-line rationale shown in the review UI. ~40–60 tokens.

**Model choice: Claude Haiku 4.5** (`claude-haiku-4-5`, $1.00/1M input,
$5.00/1M output, 200K context). This is a bounded classification task —
picking one of N existing folders per page — well within Haiku's capability,
and the per-page cost dominates the total bill at any real import size, so the
cheaper model matters far more here than for open-ended generation.

---

## 2. Batching strategy and cost estimate

**Batch size: ~25 pages per request.** Each batch sends the (cached) workspace
structure summary once plus 25 pages' worth of title+excerpt, and gets back 25
placement suggestions. This keeps individual requests small enough to retry
cheaply on failure (see §4) without re-processing an entire import.

**Prompt caching:** the workspace structure summary is identical across every
batch in an import job, so it's placed first in the prompt and cached (5-minute
TTL is sufficient — a 10,000-page import at ~25 pages/batch is 400 sequential
batches, well within a 5-minute cache window if run with reasonable
concurrency). First batch pays the cache-write premium (1.25×); every
subsequent batch pays the cache-read rate (~0.1× of base input price).

### Per-batch cost (25 pages)

| Component | Tokens | Rate | Cost |
|---|---|---|---|
| Per-page input (25 × ~360 tokens) | 9,000 | $1.00/1M | $0.0090 |
| Workspace summary — first batch (cache write, 1.25×) | 2,000 | $1.25/1M | $0.0025 |
| Workspace summary — later batches (cache read, ~0.1×) | 2,000 | $0.10/1M | $0.0002 |
| Output (25 × ~50 tokens) | 1,250 | $5.00/1M | $0.0063 |

- First batch: $0.0090 + $0.0025 + $0.0063 ≈ **$0.018**
- Each subsequent batch: $0.0090 + $0.0002 + $0.0063 ≈ **$0.015**

### Rough total cost by import size

| Pages | Batches | Estimated cost |
|---|---|---|
| 100 | 4 | **~$0.06** |
| 1,000 | 40 | **~$0.62** |
| 10,000 | 400 | **~$6.20** |

These are rough — actual cost depends on real content-excerpt length and
workspace size. The takeaway is that this is a few cents to a few dollars per
import even at large scale, so cost is not a blocker to shipping Phase 9; it's
not a reason to gate this behind a paid tier by itself.

**Batches API (50% discount)** is a natural fit if Phase 9 categorization runs
as a background job rather than blocking the user in real time — halves the
above numbers — but isn't required for the feature to be viable even without
it.

---

## 3. Review-UI contract (non-negotiable)

> No AI decision is ever applied without a user review screen.

After categorization runs, the user sees a review screen **before** anything
moves:

- **What the user sees:** a list of every imported page, each showing:
  - Its current location (from the Phase 8 structural import)
  - The AI's suggested new location (existing folder name)
  - The model's one-line rationale
  - A confidence indicator (used to flag low-confidence suggestions for
    closer attention, not to silently filter them — see §4)
- **What the user can do:**
  - **Accept all** — apply every suggested placement
  - **Reject all** — keep every page at its Phase 8 structural location;
    nothing moves
  - **Override individually** — for any page, pick a different destination
    folder (including "leave where it is") from a picker
- **How rejections are handled:** a rejected or overridden page simply keeps
  (or reverts to) its Phase 8 structural placement — there is no intermediate
  state. Applying the review screen's choices is the only thing that changes
  `documents.parent_id`; categorization itself never writes to the database.

---

## 4. Failure modes

| Failure | User-facing handling |
|---|---|
| API error / rate limit during a batch | Batch retries with backoff (a few attempts). If a batch still fails, its pages are shown in the review screen with **no AI suggestion** — they display their Phase 8 structural location with a "categorization unavailable for this page" note, and behave as if rejected (no move offered, but still overridable manually) |
| Model returns a folder ID that doesn't exist (hallucinated/stale target) | That page's suggestion is dropped; treated the same as "categorization unavailable" above, with a **warning logged** to the import job's record |
| Low-confidence suggestion | Still shown in the review screen, but visually flagged (e.g. a "low confidence" badge) so the user knows to double-check it before accepting. Not auto-rejected — the user makes the call |
| Request/batch timeout on a very large import | The batch is split into two smaller batches and retried; if a minimum batch size (e.g. 5 pages) still times out, those pages fall back to "categorization unavailable" |
| User closes the review screen without choosing | Treated as "reject all" — no placements are applied, all pages remain at their Phase 8 structural locations. Categorization can be re-run later from the import job's record |
