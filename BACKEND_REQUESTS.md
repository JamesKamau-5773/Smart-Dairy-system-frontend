# Backend requests

Changes the frontend needs from the backend. The backend is the source of truth: the frontend
does not fake or work around anything listed here. Each entry gives the exact contract and
where the frontend is waiting on it.

Status: **Open** (not started) · **Agreed** · **Done** (frontend can drop its TODO)

---

## Start here (for the backend repo)

Everything below is open. Suggested order:

1. **Security: BR-016.** Statement links use the buyer's phone number as the token, with no
   login or tenant scope. Fix before anything else.
2. **Wrong or ignored data the app shows today: BR-019.** The milk list ignores its status
   filter, and `verified_count` counts unverified records.
3. **Errors farmers can act on: BR-017** (per-field reason codes) and **BR-001** (milk edit
   duplicates).
4. **Plans and access: BR-014, BR-015, BR-020.**
5. **Data the browser still works out for itself:** BR-002, BR-003, BR-004, BR-008, BR-009,
   BR-011, BR-012, BR-013, and the open questions in `docs/contracts/period-totals.md`.
   **Summary strips and the dashboard chart: BR-021, BR-022, BR-023.**
   **Production Log and breeding fields shown as "—" until sent: BR-025, BR-026, BR-027.**
   **Dashboard: BR-028** (whether any milk is recorded today; milk remaining below zero).
6. **Language: BR-018, BR-024** (receipt status values in the contract).
7. **Safe saves and missing features:** BR-005, BR-006, BR-007, BR-010.

Each entry names the frontend files waiting on it; search for `TODO(BR-0xx)`.

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

---

## BR-017 — Per-field validation errors, as reason codes

**Status:** Open · **Raised:** 2026-11-09 (UX audit Phase 6) · **Frontend:** `lib/serverFieldErrors.js`, `hooks/useServerFieldErrors.js`, `FastMilkLog`, `CustomerForm`, `AddEmployeeModal`, `LedgerEntryFormModal`

The four main data forms now show the backend's validation under the right input, in English or
Kiswahili. But their endpoints only return `{ "code": "VALIDATION_ERROR", "error": "amount must be
greater than 0." }`: one English sentence and no field name. So the farmer sees a general message,
and a Kiswahili reader gets a generic "check the form" because the English sentence can't be
translated. Auth already does this right (`fields: { farm_name: "required" }`).

Request: for `VALIDATION_ERROR` (400/422) on these endpoints, add `fields`, mapping each request
field to a **reason code** (not a sentence):

```json
{
  "code": "VALIDATION_ERROR",
  "error": "amount must be greater than 0.",
  "fields": { "amount": "must_be_positive", "milking_date": "in_future" }
}
```

| Endpoint | Field names (as sent in the request) |
|---|---|
| `POST /api/production/yield`, `PATCH /api/production/yield/<id>` | `cow_id`, `amount`, `session`, `milking_date` |
| `POST /api/customers`, `PATCH /api/customers/<id>` | `name`, `customer_type`, `contact_person`, `phone_number`, `email`, `address`, `agreed_rate_per_liter`, `account_balance`, `daily_contract_liters` |
| `POST /api/hr/staff` | `full_name`, `role`, `phone_number`, `base_salary`, `hire_date` |
| `POST /api/finance/transactions`, `POST /api/customers/<id>/payments` | `date`, `amount`, `category`, `payment_method`, `reference_code`, `description`/`note`, `customer_id`, `income_source`, `paid_to`, `item_name`, `quantity`, `cost_class`, `animal_cost_type` |

Reason codes the app already words (`i18n/errors.*.js` `fieldReasons`): `required`, `invalid`,
`too_long`, `too_short`, `too_large`, `too_small`, `must_be_positive`, `in_future`, `duplicate`,
`not_found`. New codes are fine; tell us so we can word them. `error` stays for logs and older clients.

Also: `PLAN_LIMIT_REACHED` (BR-014) sends `resource` as an English word ("cows"); a resource
**code** with the app supplying the words would let Kiswahili readers see it translated.

---

## BR-018 — Period and group labels in the farmer's language

**Status:** Open · **Raised:** 2026-11-12 (UX audit Phase 6 follow-up) · **Frontend:** `components/periods/*`, `lib/groupTree.js`, `lib/dateFormat.js`

The app is now in English or Kiswahili, and formats its own dates in both ("04 Ago 2026"). But
the period and group-total endpoints send ready-made English labels (`"label": "Nov 2026"`,
`"November"`, `"3 – 9 Nov"`, `"27 Oct – 2 Nov"`), so a Kiswahili page shows English month names
in its headers and charts.

Affected: `GET /api/ledger/summary`, `GET /api/production/summary`,
`GET /api/ledger/group-totals`, `GET /api/production/group-totals` (`label` on the period,
`previous`, `breakdown[]` and `groups[]`).

Either option works; **A is preferred** because the app already formats dates in both languages.

- **A. Send the dates, not words.** Keep `key`, and add `from` / `to` (YYYY-MM-DD, farm-local) on
  every item that has a `label`. The app builds the label. `label` can stay for older clients.

  ```json
  { "level": "week", "key": "2026-W45", "parent": "2026-11", "from": "2026-11-03", "to": "2026-11-09", "label": "3 – 9 Nov" }
  ```

- **B. Honour `Accept-Language`.** The app would send `Accept-Language: sw-KE` or `en-KE`, and
  `label` would come back in that language (Kiswahili months: Januari … Desemba; short forms Jan,
  Feb, Mac, Apr, Mei, Jun, Jul, Ago, Sep, Okt, Nov, Des).

No new error codes.

---

## BR-019 — Milk list: status filter, status counts and complete rows

**Status:** Open · **Priority:** High · **Raised:** 2026-11-12 · **Frontend:** `pages/operations/productionLog.jsx` (status filter removed until this ships)

Found while checking `GET /api/production/yield` (`app/api/operations.py`, `production_yield_legacy`;
`app/schemas/production_filters.py`):

1. **The status filter is ignored.** `ProductionFilters.from_args` only acts on `status=anomaly`;
   any other value returns every record. The Production Log offered Verified / Pending / Flagged,
   which looked filtered but wasn't, so the frontend removed it.

   Request: accept `status` = `VERIFIED` | `RECORDED` | `FLAGGED` | `ISOLATED` (case-insensitive),
   the same values `_milk_log_status` returns, and apply it to the list, the summary and
   `GET /api/production/group-totals` / `GET /api/production/summary` so they agree. Unknown
   values → `400 { "code": "VALIDATION_ERROR", "fields": { "status": "invalid" } }`.

2. **`verified_count` counts unverified records.** In `summary`, `verified_count` and
   `verifiedEntries` are set from `status_counts['recorded']`, and `pending_count` /
   `pendingEntries` from `isolated`. Verified records aren't counted anywhere. Request: count
   `VERIFIED` separately and send `verified_count`, `recorded_count`, `flagged_count`,
   `isolated_count`; drop or correct the aliases.

3. **Rows should always carry what the list shows.** Today `milker_name` is null when
   `recorded_by` has no user (e.g. WhatsApp entries), and the frontend used to invent
   "SYSTEM", "morning", today's date and "Pending" for missing values (now it shows "—").
   Request: every row always sends `session` (`Morning` | `Midday` | `Evening`), `milkingDate`,
   `status`, and `milker_name`, or a `recorded_via` (`app` | `whatsapp` | `import`) when there is
   no user, so the app can say "WhatsApp" instead of "—".

4. **Session values.** The domain uses `Midday`; WhatsApp offers "Afternoon" and maps it. Please
   confirm `Morning` / `Midday` / `Evening` is the only set the API accepts and returns. The
   session filter compares case-insensitively, which the frontend now relies on.

**Update 2026-11-17.** The backend source at `4f70b5e` already does items 1 and 2:
`ProductionFilters.from_args` applies `status`, and the yield list's `summary` counts
`verified_count`, `recorded_count`, `flagged_count` and `isolated_count` for the same filters and
dates. The Production Log's tiles (Verified, Pending, Flagged Entries) now read them from
`GET /api/production/yield?<filters>&page=1&per_page=1` (Pending = `recorded_count`). Please
confirm that code is deployed; until it is, the tiles show the old, wrong figures.

Item 3 now has a column: the Production Log shows **Milker** and **Recorded By** separately.
Today `milker_name` is the name of the user in `recorded_by`, so the two are always the same
person. Please send on each row:

- `milker_name`: who milked the cow (may differ from who typed it in),
- `recorded_by_name`: who entered the record, or null when no user did,
- `recorded_via`: `app` | `whatsapp` | `import` | `system`.

Recorded By shows `recorded_by_name`, else the `recorded_via` label, else "—".

---

## BR-020 — Who may use unit helpers

**Status:** Open (question) · **Raised:** 2026-11-12 · **Frontend:** `lib/navAccess.js` (`UNIT_HELPER_ROLES`), `App.jsx` route

`GET/POST /api/units/conversions` allow `FARMER`, `FARM_HAND` and `VET`. The frontend only shows
the page to `SUPER_ADMIN` and `ADMIN`, so farm owners can't reach a page their account may use.
The backend is the source of truth for access, so please confirm the intended roles. The frontend
will then match them (one constant), and ideally read them from BR-015 capabilities instead.

---

## BR-021 — Summary totals for everything the filters match (no period)

**Status:** Open · **Priority:** High · **Raised:** 2026-11-16 · **Frontend:** `lib/periodTotals.js` (`currentMonthRange`, `summaryScopeParams`), `hooks/usePeriodTotals.js`, `hooks/useLedgerData.js`, `hooks/useProductionData.js`

The Production Log and the Ledger no longer have a Week / Month / Year control. The table and the
one-row summary strip above it must always cover the same dates.

What the backend takes today (read from `app/schemas/period_query.py` at backend `4f70b5e`): `period`
must be `week`, `month` or `year` (anything else, including `custom`, is `422 INVALID_PERIOD`), and
`date_from` / `date_to` then narrow that period's totals. The frontend therefore:

- opens both pages on **the current year, 1 Jan to today**, for the table and the strip, captioned
  "Totals for 2026";
- asks for any range inside one calendar year as
  `period=year&anchor=<from>&date_from=<from>&date_to=<to>`, which totals exactly that range;
- shows "Totals cover one calendar year at a time" instead of figures when the chosen range crosses
  a year boundary. It requests no summary then.

So "all dates" and multi-year ranges need this request. It stays high priority.

Request:

1. `GET /api/ledger/summary` and `GET /api/production/summary` accept **no `period`** (or
   `period=all`) together with the usual filters, and return the totals for every record those
   filters match. Same response shape; `range` = the first and last record dates; `label` may be
   null; `previous`, `change` and `breakdown` may be omitted.

   ```
   GET /api/ledger/summary?type=revenue&search=Auntie
   GET /api/production/summary?search=Neema&session=Morning
   ```

   **Production only:** `/api/production/summary` without `period` already returns the old Command
   Center shape (`revenue_total_kes`, …), so use `period=all` there, or a new path such as
   `GET /api/production/totals`.

2. Accept **any range**: `period=custom&date_from&date_to` (as `docs/contracts/period-totals.md`
   asked), or no period with `date_from` / `date_to`, on both summary endpoints, so a range across
   years has totals.

3. Same filters as the lists and group totals: ledger `type`, `category`, `search`, `date_from`,
   `date_to`; production `search`, `session`, `date_from`, `date_to`.

When this ships, the strip drops its one-year limit and the Dates filter can offer "All dates".

---

## BR-022 — Production summary: `available_litres` and `last_entry_date`

**Status:** Open · **Raised:** 2026-11-16 (first asked in `docs/contracts/period-totals.md`, question 6) · **Frontend:** `components/periods/periodConfigs.jsx` (`productionSummaryConfig`), `pages/operations/productionLog.jsx`

The Production Log strip shows **Total milk** and **Avg per day**. **Available** is left out, not
shown as "—", until this is confirmed.

The backend source at `4f70b5e` already sends `current.available_litres` and `current.last_entry_date`
(the latter ignoring the date filter, as asked below). If that code is deployed, please confirm the
definitions below and mark this **Done**. The frontend will then add Available back (one line in
`productionSummaryConfig`). The "No entries · last entry <date>" line already uses
`last_entry_date` when it is sent.

Request: in `current` of `GET /api/production/summary` (all periods, including BR-021's):

```json
"current": {
  "litres": "246.0", "entries": 36, "avg_litres_per_day": "41.0",
  "available_litres": "233.5",
  "last_entry_date": "2026-11-07"
}
```

- `available_litres`: milk produced minus milk fed to calves (and any other disposal the farm
  records) for the same filters and dates, 1 dp string. Please define which dispositions count.
- `last_entry_date`: the most recent milk entry date (`YYYY-MM-DD`, farm-local) **ignoring the
  date filter but respecting the others**, or for the whole farm. Please say which. The frontend
  clears the filters before scrolling to that day, so either works.

---

## BR-023 — Money in / out by day or month for the Farm Reporting Dashboard

**Status:** Open · **Raised:** 2026-11-16 · **Frontend:** `hooks/useMoneyFlowSeries.js`, `components/finance/MoneyFlowChart.jsx`, `pages/operations/OperationsReportsPage.jsx`

The Money in / Money out chart moved from the Ledger to the dashboard, under the KPI cards. It
follows the dashboard's filters: date range, search and customer. It shows a bar per day for ranges
up to 31 days and a bar per month for longer ranges. A single day shows the 30 days ending on it.

It reads the existing ledger group totals, one level at a time:

```
GET /api/ledger/group-totals?levels=day&date_from=2026-10-18&date_to=2026-11-16[&search=…]
GET /api/ledger/group-totals?levels=month&date_from=2026-09-01&date_to=2026-11-16[&search=…]
```

Requests:

1. **Customer filter.** Accept `buyer_id` (one or several, comma-separated, as in BR-012) on
   `GET /api/ledger/group-totals` and `GET /api/ledger/summary`, narrowing to records for those
   customers. Until then, the chart is replaced by "This chart can't be narrowed to customers yet"
   whenever a customer is selected.
2. **Confirm single-level requests.** `levels=day` or `levels=month` alone returns just those groups
   (no `year` parent needed), with `count`, `income`, `expenses` and `net` in minor units.
3. **Empty buckets.** The chart draws a day or month the API doesn't return as "no records".
   Please confirm that's what an omitted group means, or return every bucket in the range with
   `count: 0`. The second is preferred: the frontend then doesn't rely on absence.
4. **Same definitions as the KPI cards.** The cards read `/api/finance/ledger?start_date&end_date`
   (`total_income`, `total_costs`). Please confirm the chart's `income` / `expenses` count the same
   records (statuses, voided entries), so the bars add up to the cards. The frontend never sums
   them to check.


---

## BR-024 — Publish the receipt status values in the API contract

**Status:** Open · **Raised:** 2026-11-17 · **Frontend:** `components/finance/ReceiptPreview.jsx`, `i18n/__tests__/statusStrings.test.js`

The receipt preview shows `status` from `GET /api/finance/receipts/{id}`. Every status the app
shows needs an English and a Kiswahili string, keyed by the exact value the backend sends, and a
test fails when one is missing. The contract doesn't list the receipt statuses, so for now the
frontend shows the value in sentence case ("ISSUED" → "Issued") with no translation.

Requests:

1. **List the values in the contract.** Add the complete set of receipt `status` values to
   `docs/backend-integration-contract.md` (or the OpenAPI schema), with what each means. The
   model currently defines `ISSUED` and `VOIDED` (`app/models/finance.py`, `ReceiptStatus`);
   please confirm that is the full set and that the API sends them exactly as written.
2. **Treat new values as a contract change.** Adding a value later should be announced the same
   way, so the frontend can add its strings before the value reaches farmers.

When this is done, the frontend adds `financeCopy.receipt.statuses` in en and sw, an entry in
`BACKEND_STATUS_ENUMS` in the status-strings test, and drops the TODO in `ReceiptPreview.jsx`.

## BR-025 — Breeding logs: `updated_at` on each record

**Status:** Open · **Raised:** 2026-11-17 · **Frontend:** `lib/breedingUtils.js` (`TODO(BR-025)`), `pages/operations/BreedingHub.jsx` (Historical Checks)

Historical Checks has an "Updated" column. It used to show the day the page was opened for every
record, and grouped every record under the current month because of it. It now groups by the AI
service date and shows the record's own `updated_at`, or "—" when there isn't one.

`GET /api/operations/breeding-logs` should include, on each record, when it was last changed (a
vet outcome recorded, an edit), as an ISO 8601 timestamp:

```json
{ "id": 88, "insemination_date": "2026-01-22", "status": "Pregnant", "updated_at": "2026-02-20T09:00:00Z" }
```

If it is already sent under another name, say which and the frontend will read that instead.

---

## BR-026 — Milk records: change against the cow's 5-day average

**Status:** Open · **Raised:** 2026-11-17 · **Frontend:** `pages/operations/productionLog.jsx` (`TODO(BR-026)`, the "vs 5-day Avg" column)

The Production Log has a **vs 5-day Avg** column, with a significant drop in bold red. The
frontend never works this out; it shows "—" until the backend sends it. On each row of
`GET /api/production/yield`:

```json
{ "id": 812, "session": "Evening", "amount": "13.8", "vs_avg_litres": "-2.1", "significant_drop": true }
```

- `vs_avg_litres`: this record's litres minus the cow's average for **the same session** over the
  5 previous days that have a record for it (signed, 1 dp string), or null when there are fewer
  than the backend's minimum. Please confirm the window and whether it is days or records.
- `significant_drop`: true when the backend's milk-drop rule counts this record as a drop (the
  same rule as `GET /api/production/milk-drop-alerts`, so the two agree).

---

## BR-027 — Calf feedings: total litres

**Status:** Open · **Raised:** 2026-11-17 · **Frontend:** `lib/backendApi.js` (`listMilkDispositionsWithTotals`, `TODO(BR-027)`), `components/operations/RecentCalfFeedings.jsx`

The Production Log's "Recent calf milk allocations" card reads "53 feedings · 310.00 L allocated".
`GET /api/production/milk-dispositions` already sends `count`; it shows "— allocated" until the
litres total is sent too:

```json
{ "items": [ … ], "count": 53, "total_liters": "310.0" }
```

`total_liters`: the sum of `liters` for the same filters (`date`, `calf_id`), 1 dp string.

Today `CALF_FEED` is the only type the backend allows (the `milk_dispositions` check constraint),
so `count` and `total_liters` are calf feedings by definition. If other uses of milk are added
later (household, sale, discard), please add a `type` filter to this endpoint and make `count`
and `total_liters` follow it, so the card's "N feedings · X L allocated" stays calf-only.

---

## BR-028 — Dashboard: milk records today, and milk remaining below zero

**Status:** Open · **Raised:** 2026-11-18 · **Frontend:** `lib/dashboardUtils.js` (`readDailySummary`, `TODO(BR-028)`), `pages/CommandCenter.jsx`

Before today's first milking, the Command Center shows a "No milking recorded yet today." notice
above its milk cards. The backend doesn't say whether any milk is recorded today, so for now the
notice shows only when `GET /api/production/summary` sends `cows_milked: 0`. Please add:

```json
{ "records_today": 0, "cows_milked": 0, "production_total_liters": "0.0" }
```

- `records_today`: the number of milk records dated today (the farm's local day), with the same
  status rules as `production_total_liters`. The frontend then shows the notice when it is 0.

**Milk remaining below zero.** `remaining_milk_liters` can come back negative (more sold or used
than recorded). The dashboard shows it as sent, in red. Please check the calculation, and confirm
what it should be when a sale is entered before that day's milk.
