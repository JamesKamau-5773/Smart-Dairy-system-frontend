# Ledger re-layout and shared page components

Date: 2026-11-07 · Pages: `/finance/ledger`, `/operations/yield` (Production Log)
Screens: `docs/audit/screens/{before,after}-{ledger,production-log}-{1280,390}.png`,
reproducible with `e2e/manual/period-pages-screens.mjs` (mocked API, same figures before and after).

## Step 0: the two unpaid figures

| Shown as (before) | Value | Source | Scope |
|---|---|---|---|
| Summary panel “Unpaid” | KES 15,986.00 | `current.unpaid` from `GET /api/ledger/summary?period&anchor&<filters>` | **Period-scoped** (the selected week/month/year) **and filter-scoped** (type, category, search, plus the old filter card's date range). |
| Navy block “Unpaid Money” | KES 37,030.00 | `summary.outstanding_receivables` from `GET /api/finance/ledger` (the list request) | **All time**, per its own help text: “includes older debts that were added to a buyer's profile before you started using this daily ledger”. The list request carried the page filters, so whether the backend narrowed this figure by them is not visible from the frontend. |

Not determinable from the frontend (questions for the backend; the contract doesn't define them):

- Which statuses count as unpaid in each figure (`PENDING` only? partially paid? disputed?).
- Whether customer credit is netted off either figure.
- Whether `outstanding_receivables` respects `type`, `category`, `search`, `date_from`, `date_to`.

Resolution (approved): both figures stay, each labelled with its scope.

- **Unpaid in 2026**: `current.unpaid`, following the period and filters.
- **Owed to you (all time)**: `outstanding_receivables`, now read from an unfiltered, undated request (`financeApi.getLedgerBalances`), so no filter or period can narrow it.
- **Customer credit (now)**: from the same request.

## Decisions taken (approved 2026-11-06)

- **Tokens:** `money.positive` `#166534` (new, 7.1:1 on white) and `money.negative` `#7F1D1D` (= existing `danger-900`). Chart bars use existing `brand` (money in) and `ink-500` (money out, 4.8:1, so it meets the 3:1 graphics minimum).
- **All-time owed:** stays in the secondary row, labelled “(all time)”.
- **Summary scope:** follows Type, Category and search. A muted “Filtered: …” note appears in the summary header whenever filters are active.
- **Dates:** day first everywhere: “03 Nov 2026”, day groups “Tue 03 Nov”, inputs dd/mm/yyyy. `herdUtils.formatDate` now delegates to `lib/dateFormat.js`, so **every page using it changes**. Month names are fixed in code, not Intl, because en-GB gives “Sept” on some runtimes.
- **Table header:** neutral (`ink-50`), not brand blue. Brand blue is kept for actions and links.
- **Receipt icon:** a paperclip for saved photos and an image-plus for none yet. These are different shapes, not filled vs outline, because Lucide icons are stroke-only. The icon is clickable, and “Add photo”, “View receipt” and “Correct” are also in ⋮.
- **Single-child folding:** 2026 › November › Tue 03 Nov folds into one “Tue 03 Nov” header, instead of “November · Nov 03”. The folded header keeps every key, so a chart click on the month still finds it.

## Shared components (presentational, configured per page)

| Component | File | Used by |
|---|---|---|
| PageHeader | `src/components/layout/PageHeader.jsx` | Ledger (secondary in ⋮ below md), Production Log (`secondaryOnMobile="inline"`, as agreed) |
| PeriodSummary | `src/components/periods/PeriodSummary.jsx` (+ `PeriodControl`, `PeriodChart`) | Both. Production passes no secondary row and no chart. |
| DataSection | `src/components/data/DataSection.jsx` (+ `Toolbar.jsx`, `DataTable.jsx`) | Both |
| GroupRow | `src/components/periods/GroupRow.jsx` (`GroupRowTable`, `GroupRowCard`) via `GroupedList` | Both. Totals are placed by **column id** (`columnTotals`), from the same `COLUMNS` array as the header and rows. |

Page-specific choices live in `periodConfigs.jsx`:

- `levels`: the Ledger uses year/month/day; Production keeps weeks.
- `collapseSingleChild`: the Ledger only.
- `columnTotals`, `labelMeta`, the metric builders and the chart series.

The folding rule is a pure, tested function (`collapseSingleChildren` in `lib/groupTree.js`).

## Backend gaps (the frontend computes none of these)

1. **Custom period:** `GET /api/ledger/summary?period=custom&date_from&date_to` is now sent. It needs the same response shape, including `previous` (the comparable preceding range, with a label) and `breakdown` buckets.
2. **`previous` always present**, with `label` and `count`, even when that period has no records, so the page can say “No 2025 data”. Today a missing `previous` shows “No previous-period data”.
3. **`breakdown[]` items:**
   - `short_label` for the axis (“Mar”).
   - `count`, so an empty sub-period is told apart from KES 0 in and out. Until it's sent, a bucket with nothing in and nothing out is drawn empty.
   - Keys the ledger can scroll to: the contract's month view uses week keys, and the ledger no longer has week groups. Day keys (or month keys for a year) are needed.
4. **`/api/ledger/group-totals?levels=year,month,day`** should return day groups with `parent` = the month. A week parent is ignored, and the frontend falls back to the record buckets.
5. **List and group totals should accept `period` + `anchor`.** Today the table waits for the summary's `range` before it can request rows (one extra round trip). If the summary fails, the list loads undated and says so.
6. **A dedicated balances endpoint** (all-time receivables, customer credit), instead of `GET /api/finance/ledger?page=1&per_page=1` read for its `summary`.
7. **Define `unpaid` and `outstanding_receivables`:** the statuses counted, credit netting, and filter behaviour (see Step 0).
8. **`status` on every ledger row.** The Status column shows “—” when it's missing (it no longer falls back to the transaction type).
9. **Day group `label`** is still US style (“Nov 06, 2026”). The frontend now formats day keys itself; a day-first label from the API would keep other clients consistent.

## Deviations from the brief, and why

- **Desktop table from 1280px (xl), cards below**, as on the Production Log. Nine columns don't fit between 768 and 1279px; the brief's card layout applies below md and is also used up to xl.
- **The sticky month header doesn't apply when a month folds into its single day**, because the folded header is a day header. Unfolded months stay sticky.
- **Production Log keeps monospace litres** (its agreed layout), against the “monospace for money only” rule.
- **Production Log changes** to meet the one-container rule:
  - The sky-blue top edge is gone.
  - Group fills are neutral instead of brand tints.
  - Metrics have dividers.
  - Day labels read “Fri 06 Nov”.
  - The ▼ arrow uses the negative token.
  - The date filter is dd/mm/yyyy.
  - Everything else matches `docs/ui/production-log/after-*`.

## Also fixed while here

- The expense form showed the **Cost classification** select twice. The duplicate is removed.
- `Money` hid the minus from screen readers (`aria-hidden`), so a negative net was read as positive. It now announces “minus”.
- The ~340-line entry form moved out of the page into `components/finance/LedgerEntryFormModal.jsx`.

## Verification

- Vitest: 97 files, 599 tests passing (baseline 589). New tests cover:
  - folding, levels and week-parent fallback
  - totals sitting in the Money in and Money out columns (colspan 5, then in, out, empty, empty)
  - day-first formatting and dd/mm/yyyy parsing
  - custom range sent to the summary and the list
  - future dates refused
  - “No … data”
  - scope labels
  - all-time balances requested without filters
- Lint: the changed files are clean.
- No hard-coded colours: grepping the changed files for hex, `rgb()` and default Tailwind palettes finds nothing. The only new hex values are the two approved tokens in `tailwind.config.js`.
- Screens: group In/Out totals line up with the row values (after-ledger-1280); one labelled unpaid figure per scope; the custom range is the only date control (no `<input type="date">` on the page, which is also asserted in tests).
