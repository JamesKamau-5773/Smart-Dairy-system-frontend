# Period totals API contract v1

All amounts are computed by the backend. The frontend never sums, buckets or converts.

## Conventions

- Money: integer minor units (cents) as strings, e.g. `"2700500"` = KES 27,005.00
- Litres: decimal strings with 1 dp, e.g. `"246.0"`
- Dates: local farm dates (Africa/Nairobi) as `YYYY-MM-DD`; weeks are ISO, starting Monday
- Bucket keys: year `2026`, month `2026-11`, week `2026-W45`, day `2026-11-06`
- All endpoints are farm-scoped via the JWT and accept the same filters as the list
  endpoints (`type`, `category`, `search`, `date_from`, `date_to`). Totals respect those filters.

## 1) `GET /api/ledger/summary?period=week|month|year&anchor=YYYY-MM-DD&<filters>`

```json
{
  "period": "month", "key": "2026-11", "label": "Nov 2026",
  "range": { "from": "2026-11-01", "to": "2026-11-30" },
  "has_next": false,
  "current":  { "income": "1740000", "expenses": "320000", "net": "1420000",
                "unpaid": "150000", "count": 29 },
  "previous": { "key": "2026-10", "label": "Oct 2026", "income": "...", "expenses": "...",
                "net": "...", "unpaid": "...", "count": 80 },
  "change":   { "net_abs": "-80000", "net_pct": "-5.3" },
  "breakdown": [ { "key": "2026-W44", "label": "27 Oct – 2 Nov", "income": "...",
                   "expenses": "...", "net": "..." } ]
}
```

## 2) `GET /api/production/summary?period=week|month|year&anchor=YYYY-MM-DD&<filters>`

```json
{
  "period": "month", "key": "2026-11", "label": "Nov 2026",
  "range": {}, "has_next": false,
  "current":  { "litres": "246.0", "entries": 36, "milking_days": 6,
                "avg_litres_per_day": "41.0", "avg_litres_per_cow_day": "6.8" },
  "previous": { "key": "2026-10", "label": "Oct 2026", "litres": "1306.4" },
  "change":   { "litres_abs": "...", "litres_pct": "..." },
  "breakdown": [ { "key": "2026-11-01", "label": "Sat 1", "litres": "47.5" } ]
}
```

## 3) Group totals

- `GET /api/ledger/group-totals?levels=year,month,week,day&<filters>`
- `GET /api/production/group-totals?levels=year,month,week,day&<filters>`

A flat list, so the frontend can look up totals by key:

```json
{
  "groups": [
    { "level": "year",  "key": "2026",       "label": "2026",
      "count": 300, "income": "...", "expenses": "...", "net": "..." },
    { "level": "month", "key": "2026-11",    "parent": "2026",    "label": "November" },
    { "level": "week",  "key": "2026-W45",   "parent": "2026-11", "label": "3 – 9 Nov" },
    { "level": "day",   "key": "2026-11-06", "parent": "2026-W45","label": "Nov 06, 2026" }
  ]
}
```

Production groups carry `litres`, `entries` and `avg_litres_per_day` instead of money fields.

## 4) List endpoints

The existing list endpoints add this to each record:

```json
"bucket": { "year": "2026", "month": "2026-11", "week": "2026-W45", "day": "2026-11-06" }
```

so the frontend groups cards by key without doing any date maths. Totals come from
endpoint 3, never from the records currently loaded. Headers stay correct even when the
list is paginated.

## Errors

Standard error envelope; `422` for an invalid period or anchor.

## Open questions for the backend (raised by the frontend)

1. `/api/production/summary` without `period` is already used by the Command Center
   (`revenue_total_kes`, `net_margin_kes`). Please confirm that a call without `period`
   keeps returning the old shape.
2. The ledger list lives at `/api/finance/ledger`, but this contract uses `/api/ledger/...`.
   Please confirm the paths.
3. Step ‹ › currently sends `anchor` = the day before `range.from` or the day after
   `range.to`. Adding `previous.anchor` and `next_anchor` would remove that calendar step
   from the frontend.
4. Production list filters `status` and `session` are sent as query params with those
   names to the list, summary and group-totals endpoints. Please confirm that they are
   supported and that totals respect them.
5. The ledger list previously used `search_query`; the frontend now sends both
   `search_query` and `search` to the list and `search` to the totals endpoints.
6. Production Log summary strip (requested for the re-layout). Please add to
   `GET /api/production/summary`:
   - `current.fed_to_calves_litres` (and `previous.…`): milk fed to calves in the period, 1 dp string.
   - `current.available_litres`: milk available after calf feeding in the period, 1 dp string (optional metric).
   - `current.last_entry_date`: the farm's most recent milk entry (`YYYY-MM-DD`), so an empty
     period can say "No entries this week · last entry Sep 23, 2026".
   - Per-metric change percentages in `change`: `avg_litres_per_day_pct`, `entries_pct`,
     `fed_to_calves_pct`, `available_pct` (signed decimal strings, like `litres_pct`).
   Until a field is present the frontend leaves that metric or change line out; it never computes it.
7. The "Recent calf feedings" section lists records only. If a total is wanted there, it should
   come from the API too (the same `fed_to_calves_litres`).
8. Ledger re-layout (2026-11-07, details in `docs/audit/ledger-relayout.md`):
   - `GET /api/ledger/summary?period=custom&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`. Not sent any more:
     the backend answers `422 INVALID_PERIOD`. The frontend sends `period=year` narrowed by `date_from` /
     `date_to` instead (BACKEND_REQUESTS.md, BR-021),
     with `previous` (the comparable preceding range) and `breakdown`.
   - Always return `previous` with `label` and `count`, even when that period is empty.
   - `breakdown[]`: add `short_label` ("Mar") and `count`; key month breakdowns by day so
     a bar maps to a ledger group (the ledger no longer shows weeks).
   - `group-totals` with `levels=year,month,day` (now sent): day `parent` = month.
   - Accept `period` + `anchor` on the list and group-totals endpoints, so the table
     needn't wait for the summary's `range`.
   - A balances endpoint (all-time receivables, customer credit), and definitions of
     `unpaid` and `outstanding_receivables` (statuses counted, credit netting, filters).
   - Day group `label` day-first ("03 Nov 2026").
