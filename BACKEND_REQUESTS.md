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

---

## BR-006 — Audit trail recorded by the backend

**Status:** Open · **Raised:** 2026-11-08 (UX audit Phase 3) · **Frontend:** none (client log removed)

The frontend used to write an "audit log" to the browser's sessionStorage (`logToAuditTrail`).
It was lost when the tab closed, could be edited by anyone with the phone, and was never sent
anywhere, so it has been removed. Who changed what must be recorded where the change happens.

Request: the backend records an audit event for every create, update and delete of cows,
milk records, medical records, breeding logs, calving events, semen inventory, customers,
inventory items and ledger entries:

```json
{
  "id": 9812,
  "occurred_at": "2026-11-08T06:12:44Z",
  "tenant_id": 3, "farm_id": 4,
  "actor_id": 17, "actor_name": "Jane Wanjiru",
  "action": "delete",
  "record_type": "cow", "record_id": "57",
  "summary": "Deleted Neema (KE-012)",
  "changes": { "name": { "before": "Neema", "after": null } }
}
```

and exposes it read-only to farm owners:
`GET /api/audit-events?record_type=cow&record_id=57&page=1&per_page=50` →
`{ "items": [ … ], "meta": { "page", "per_page", "total", "pages" } }`; `403` for other roles.

---

## BR-007 — Deleting a customer

**Status:** Open · **Raised:** 2026-11-08 (UX audit Phase 3) · **Frontend:** `Customers.jsx`, `financeApi.deleteCustomer`

The Customers page offers **Delete** (now with type-to-confirm and the balance shown), and
`financeApi.deleteCustomer` sends `DELETE /api/customers/<id>`, but the backend has no DELETE
route for customers (only GET/PATCH), so every delete fails today. Delete is now hidden behind
the `customerDelete` flag (off); set `VITE_FEATURE_CUSTOMER_DELETE=true` when this ships.

Requested contract:

`DELETE /api/finance/customers/<customer_id>`

| Status | Body | When |
|---|---|---|
| 200 | `{ "id": 7, "deleted": true }` | Deleted (no deliveries, payments or ledger entries). |
| 404 | `{ "error": "Customer not found." }` | Unknown id for this tenant. |
| 409 | `{ "code": "CUSTOMER_HAS_HISTORY", "error": "Wanjiku Kiosk has deliveries and payments recorded. Archive them instead.", "can_archive": true }` | The customer has history; deleting would orphan it. |
| 409 | `{ "code": "CUSTOMER_HAS_BALANCE", "error": "Wanjiku Kiosk still owes KES 3,700.00. Settle or write off the balance first." }` | Non-zero balance. |

If customers should be archived rather than deleted (like inventory items), say so and the
frontend will switch the action to **Archive**. Frontend follow-up: point
`financeApi.deleteCustomer` at the agreed path and map the two 409 codes.

---

## BR-008 — Farm setup progress (welcome checklist)

**Status:** Open · **Raised:** 2026-11-09 (UX audit Phase 4) · **Frontend:** `WelcomeChecklist.jsx`, `welcomeProgress.js` (`TODO(BR-008)`)

The dashboard's welcome checklist (add a cow, record a milking, add a buyer) works out which
steps are done from the farm's lists and remembers "dismissed / done" in the phone's
localStorage, so another phone shows it again and the backend has no idea a farm is set up.

`GET /api/farms/current/setup-progress`

```json
{
  "steps": [
    { "id": "cow", "done": true },
    { "id": "milk", "done": false },
    { "id": "buyer", "done": false }
  ],
  "status": "active",
  "milestones": { "acknowledged_litres": 1000 }
}
```

`status`: `active` | `done` | `dismissed`.
`PATCH /api/farms/current/setup-progress` with `{ "status": "dismissed" }` or
`{ "milestones": { "acknowledged_litres": 10000 } }` → the updated object. `403` for staff
without the dashboard. Frontend follow-up: read and write this instead of localStorage.

---

## BR-009 — Semen tank total

**Status:** Open · **Raised:** 2026-11-09 (UX audit Phase 4) · **Frontend:** `BreedingHub.jsx` (`TODO(BR-009)`)

The Breeding page shows "N Straws in Tank", summed in the browser from the inventory list.
`GET /api/operations/semen-inventory` should return `{ "items": [ … ], "summary": { "total_straws": 42, "low_stock_count": 1 } }`
(keeping the bare-array response working for older clients, or versioned).

---

## BR-010 — Deleting a unit helper (conversion)

**Status:** Open · **Raised:** 2026-11-09 (UX audit Phase 4) · **Frontend:** `UnitConversions.jsx`

The Unit Helpers page had a remove button that only removed the row on the phone (it came back
on reload). There is no `DELETE` route for conversions, so the button is hidden until there is.

`DELETE /api/units/conversions/<id>` → `200 { "id": 5, "deleted": true }`; `404` unknown id.

Done on the frontend (Phase 4 follow-ups): the Unit Helpers page now sends what
`POST /api/units/conversions` requires (`item_id`, `unit_name`, `kg_equivalent`; it used to send
a free-text material, so every save was rejected), and the Farm Task View reads conversions from
`GET /api/units/conversions` instead of the phone.

---

## BR-011 — Herd summary: last update time

**Status:** Open · **Raised:** 2026-11-09 (UX audit Phase 4) · **Frontend:** `HerdRegistry.jsx` (`TODO(BR-011)`)

The herd counts now come from the `summary` that `GET /api/herd` already returns. "Last updated"
is still read from the rows on the page; add `"latest_updated_at": "2026-11-08T07:10:00Z"` to
that `summary`.

---

## BR-012 — Buyer performance for several buyers at once

**Status:** Open · **Raised:** 2026-11-09 (UX audit Phase 4) · **Frontend:** `OperationsReportsPage.jsx` (`TODO(BR-012)`)

With several buyers selected, the reporting dashboard calls
`GET /api/reports/buyer-performance` once per buyer and adds the litres, revenue, payments and
balances together in the browser. Accept `buyer_id=1,2,3` (or repeated `buyer_id`) and return the
combined `summary` and `daily_records`.

---

## BR-013 — Daily milk series for one cow

**Status:** Open · **Raised:** 2026-11-09 (UX audit Phase 4) · **Frontend:** `MilkHistory.jsx` (`TODO(BR-013)`)

A cow's milk history now shows the backend's average, peak, total and session count. The trend
chart and the per-day group totals are still added up from her sessions in the browser.
Add to `GET /api/animals/<id>/milk-history`:

```json
{ "daily": [ { "date": "2026-11-07", "liters": "14.5", "sessions": 2 } ] }
```

(honouring `start_date` / `end_date`).

---

## BR-014 — Plan, limits and demo status on the session (`entitlements`)

**Status:** Open · **Raised:** 2026-11-09 (UX audit Phase 5) · **Frontend:** `useEntitlements`, `DemoBanner`, `LockedFeature`, `receiptAttachments.receiptLimits`, `apiErrors.getPlanErrorMessage`

Maziwa Smart has paid plans and a demo account, but the backend sends nothing about either, so
the app can't show a plan, a limit, a locked feature or a demo marker. The frontend is ready
and shows nothing until this arrives (it never assumes a plan); the backend enforces access.

Add `entitlements` to the session returned by login, `GET /api/auth/me` and switch-farm:

```json
{
  "entitlements": {
    "plan": { "id": "starter", "name": "Starter" },
    "is_demo": false,
    "features": ["dashboard", "production", "tasks", "herd", "breeding", "medical", "feeding", "feed", "customers", "finance", "inventory", "reports", "safety", "staff", "payroll"],
    "limits": {
      "cows": 50,
      "staff_accounts": 3,
      "receipt_upload_max_bytes": 4194304,
      "receipts_per_entry": 5
    },
    "usage": { "cows": 42, "staff_accounts": 2 },
    "upgrade_url": "https://maziwasmart.co.ke/plans"
  }
}
```

- `features`: every area the plan includes, using the **same keys as `page_access`** (`dashboard`,
  `production`, `tasks`, `herd`, `breeding`, `medical`, `feeding`, `feed`, `customers`, `finance`,
  `inventory`, `reports`, `safety`, `staff`, `payroll`, `member_admin`). A key missing from the
  list means that area is locked: the app shows an "isn't in your plan" card on its pages
  (`PageAccessGate` in `DashboardLayout.jsx`, list in `pageRoutes.js`). Send the full list, not
  just the extras: an empty list locks every area. Omit `features` entirely if unknown.
  Which plans include which areas is the backend's decision; the frontend holds no such table.
- `limits` / `usage`: numbers, or `null` for unlimited / unknown.
- `upgrade_url`: https only; when absent the app shows the support phone number instead.
- `is_demo: true` for the shared demo account. The backend must refuse changes that would alter
  or delete shared demo data.

Refusals, with these codes (the app shows a clear message for each; `apiErrors.js`):

| Status | Code | Body extras | When |
|---|---|---|---|
| 402 | `PLAN_LIMIT_REACHED` | `limit`, `resource` (e.g. `50`, `"cows"`) | Creating beyond a plan limit. |
| 402 | `FEATURE_NOT_IN_PLAN` | `feature` | Using a feature the plan lacks. |
| 402 | `SUBSCRIPTION_EXPIRED` | — | Writes after the subscription ended (reads still allowed). |
| 403 | `DEMO_READ_ONLY` | — | Destructive or shared-data changes on the demo account. |

---

## BR-015 — Page and menu access from backend capabilities

**Status:** Open · **Raised:** 2026-11-09 (UX audit Phase 5) · **Frontend:** `roles.js`, `permissions.js`, `Sidebar.jsx`, `MobileBottomNav.jsx` (not changed yet)

Which pages and menu items a user sees is still partly decided in the frontend from role names
(`roles.js` alias tables such as `canViewAdminControls`, `canAccessCommandCenter`,
`canManageInventoryItems`). `page_access` is respected when present, but not every account has
it, and the role tables can drift from what the backend actually allows.

Request: return the user's capabilities on the session, decided by the backend, e.g.
`"capabilities": ["milk.record", "milk.delete", "herd.manage", "inventory.manage", "ledger.view", "payroll.run", "reports.view", "staff.manage"]`,
alongside `page_access`. The frontend would then show or hide pages and actions from these
alone and delete the role-alias tables. (Not changed in Phase 5, as agreed.)

---

## BR-016 — Shared statement links expose any buyer's account by phone number (security)

**Status:** Open · **Priority:** High · **Raised:** 2026-11-09 · **Frontend:** `CustomerPortal.jsx` (behind the `customerPortal` flag, off), `lib/customerStatement.js`

`GET /api/statements/<token>` (`backend/app/api/webhooks.py`) needs no login, and its "token" is
the customer's **phone number**: `Customer.query.filter_by(phone_number=token).first()`. Anyone who
knows or guesses a buyer's phone number gets their balance and every transaction. The lookup is
not scoped to a farm, so a number shared by buyers on two farms returns whichever comes first.
It also puts the phone number in the URL, where it ends up in browser history and server logs.

**Asked now:** disable or protect this route until the fix below ships. The frontend no
longer calls it (the portal page is off and says links aren't available yet).

Requested contract:

`POST /api/finance/customers/<customer_id>/statement-links` (authenticated; the farm's own customer only)

| Status | Body | When |
|---|---|---|
| 201 | `{ "url": "https://…/shared/statement/<token>", "expires_at": "ISO-8601" }` | Link created. `<token>` is random (≥128 bits) and opaque, and does not contain the phone number or IDs. Store only its hash. |
| 403 | `{ "code": "FORBIDDEN" }` | Not this farm's customer, or no permission. |
| 404 | `{ "code": "NOT_FOUND" }` | No such customer. |

`GET /api/statements/<token>` (public)

| Status | Body | When |
|---|---|---|
| 200 | `{ "farm": { "name": "…" }, "customer": { "name": "…", "account_balance": "1234.00" \| null }, "transactions": [ { "id", "date", "description", "category", "reference_code", "amount" } ], "generated_at": "ISO-8601" }` | Valid, unexpired token. Omit the customer's phone number. Send `account_balance: null` rather than 0 when unknown. |
| 404 | `{ "code": "STATEMENT_LINK_INVALID" }` | Unknown, expired or revoked token (same answer for each, so tokens can't be probed). |
| 429 | `{ "code": "RATE_LIMITED" }` | Too many attempts from one address. |

Also wanted: `DELETE /api/finance/statement-links/<id>` to revoke a link. The frontend will add
"Share statement link" to the buyer actions once this exists, and turn the portal flag on.
