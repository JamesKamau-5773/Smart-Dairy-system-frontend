# Backend requests

Changes the frontend needs from the backend. The backend is the source of truth: the frontend
does not fake or work around anything listed here. Each entry gives the exact contract and
where the frontend is waiting on it.

Status: **Open** (not started) · **Agreed** · **Done** (frontend can drop its TODO)

---

## BR-001 — Milk record edit (PATCH) should guard duplicates and allow fixing the cow

**Status:** Open · **Raised:** 2026-11-08 (UX audit Phase 1) · **Frontend:** `FastMilkLog.jsx` (edit mode), `productionApi.updateYield`

Since Phase 1 the frontend edits a milk record in place with the existing
`PATCH /api/production/yield/<log_id>` (it used to delete the record and create a new one,
which could lose the record if the create failed). Two gaps remain on the backend:

1. **Duplicates on edit.** `POST` rejects a second record for the same cow, session and
   milking date (`409 DUPLICATE_MILK_ENTRY`), but `PATCH` does not check. Changing a record's
   session or date onto a slot that already has a record silently creates a duplicate.
2. **Wrong cow.** `PATCH` ignores `cow_id`, so a record logged against the wrong cow can only
   be fixed by deleting it and recording it again. The frontend shows the cow read-only on
   edit and tells the farmer to do that.

### Requested contract

`PATCH /api/production/yield/<log_id>`

Headers: `Authorization`, `X-Tenant-ID`, `X-Farm-ID`, `Idempotency-Key` (already honoured by
the idempotency middleware).

Request body (all optional; omitted fields are unchanged):

```json
{
  "amount": 12.5,
  "session": "morning | midday | evening",
  "milking_date": "YYYY-MM-DD",
  "cow_id": "<cow id or tag, as accepted by POST>"
}
```

Responses:

| Status | Body | When |
|---|---|---|
| 200 | `{ "id", "cow_id", "cow_tag", "cow_name", "amount", "session", "milkingDate", "status" }` | Updated. `cow_tag`/`cow_name` added so the client can show the result without a refetch. |
| 400 | `{ "error": "…" }` | Invalid amount, session or date (as today). |
| 404 | `{ "error": "Production record not found." }` / `{ "error": "Cow not found." }` | Unknown record / unknown `cow_id` (same body as POST). |
| 409 | `{ "code": "DUPLICATE_MILK_ENTRY", "error": "<cow>'s <session> milk for <date> is already recorded (<n> L). Edit that record instead." }` | Another record already exists for the resulting cow + session + date (excluding this one). Same code and wording as POST. |

When `cow_id` changes, the record's hold/isolation status should be worked out for the new cow
the same way POST does it, and returned in `status`.

Frontend follow-up when done: allow choosing the cow in edit mode (`FastMilkLog.jsx`, the
read-only "Cow" field) and map `409 DUPLICATE_MILK_ENTRY` on edit to the same message as on
create (already handled by code).

---

## BR-002 — Customer list totals from the backend

**Status:** Open · **Raised:** 2026-11-08 (UX audit Phase 2) · **Frontend:** `BuyersList.jsx` (`TODO(BR-002)`)

The Buyers list shows **Total Outstanding** and **Settled Accounts**, which the frontend sums
from the customer rows. Since Phase 2 these show "—" whenever any balance is missing, but the
totals (and the rule that credits don't reduce what others owe) belong to the backend.

`GET /api/finance/customers`: add a `summary` next to `items` and `meta`:

```json
{
  "items": [ … ],
  "meta": { … },
  "summary": {
    "customer_count": 12,
    "total_outstanding_kes": "18450.00",
    "settled_count": 7,
    "unknown_balance_count": 0
  }
}
```

`total_outstanding_kes` is the sum of positive balances only (credits are not subtracted);
`null` if it can't be computed. Frontend follow-up: read `summary` and delete the sum.

---

## BR-003 — Low-stock flag on the inventory item list

**Status:** Open · **Raised:** 2026-11-08 (UX audit Phase 2) · **Frontend:** `InventoryRegistry.jsx` (`TODO(BR-003)`)

The item list (`GET /api/inventory/items`) has no low-stock flag; the backend only reports
`reorder_alert` / `lowStock` after a stock movement. The frontend compares stock with the
reorder level itself (and since Phase 2 shows no status when either is missing).

Add to each item in `GET /api/inventory/items`:

```json
{ "is_low_stock": true }
```

`true`/`false` as the backend decides it (same rule as `reorder_alert`), or `null` when it
can't tell (no stock figure or no reorder level). Frontend follow-up: drop the comparison.

---

## BR-004 — Ranked "best performing" feed mixes

**Status:** Open · **Raised:** 2026-11-08 (UX audit Phase 2) · **Frontend:** `TopRecipesList.jsx` (`TODO(BR-004)`)

The Feed dashboard's "Best Performing Feed Mixes" de-duplicates saved recipes and ranks them
by average daily yield, then cost per litre, in the browser.

`GET /api/v1/nutrition/recipes/top?limit=5`:

```json
{
  "items": [
    {
      "rank": 1,
      "recipe_id": 31,
      "name": "Dairy Meal Mix",
      "recipe_type": "dairy_meal",
      "avg_daily_yield_liters": "14.2",
      "feed_cost_per_liter_kes": "18.40",
      "last_fed_on": "2026-11-06",
      "target_protein_percentage": "16.0",
      "ingredients": [{ "name": "Maize germ", "inclusion_percentage": "40.0" }]
    }
  ],
  "ranked_by": "avg_daily_yield_liters desc, feed_cost_per_liter_kes asc"
}
```

Figures are `null` when unknown. Errors: `401`, `403` as elsewhere. Frontend follow-up:
render the list as returned and remove `selectTopMixes`.

---

## BR-005 — Safe concurrent saves of the daily routine

**Status:** Open · **Raised:** 2026-11-08 (UX audit Phase 2) · **Frontend:** `useRoutinePlans.js`, `offlinePolicy.js`

`POST /api/routine/plans` deletes and re-creates the whole routine. A save made from an old
copy (another phone, or a queued offline save) silently overwrites newer changes, so since
Phase 2 the frontend only saves the routine while online.

Request: version the routine.

- `GET /api/routine/plans` returns `{ "version": 7, "items": [ … ] }` (or an `ETag` header).
- `POST /api/routine/plans` accepts `If-Match: 7` (or `"version": 7` in the body) and returns
  `409 { "code": "ROUTINE_CHANGED", "error": "The routine was changed on another phone. Reload it and try again." }`
  when the stored version is newer; `201 { "version": 8 }` on success.

Frontend follow-up: send the version, show the 409 message with a "Reload" action, and then
the save can be queued offline again.
