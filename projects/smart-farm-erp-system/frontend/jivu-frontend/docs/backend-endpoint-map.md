# Backend Endpoint Map

This map translates the routed `jivu-frontend` build into backend responsibilities. It is intentionally build-wide, not HR-only.

## Backend-Provided Route Inventory

The backend has already defined these concrete routes. Where both singular and plural resource names exist, the frontend should treat them as equivalent aliases if the payload shape is the same.

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/switch-farm`
- `GET /api/auth/status`

### Tenant

- `GET /api/tenant/profile`

### HR

- `POST /api/hr/staff`
- `POST /api/hr/employees`
- `GET /api/hr/staff`
- `GET /api/hr/employees`
- `GET /api/hr/staff/<staff_id>`
- `GET /api/hr/employees/<staff_id>`
- `PATCH /api/hr/staff/<staff_id>`
- `PATCH /api/hr/employees/<staff_id>`
- `POST /api/hr/staff/<staff_id>/verify-return`
- `POST /api/hr/employees/<staff_id>/verify-return`
- `POST /api/hr/payroll`
- `POST /api/hr/payroll-records`
- `GET /api/hr/payroll`
- `GET /api/hr/payroll-records`
- `POST /api/hr/payroll/runs`

### Dashboard

- `GET /api/v1/dashboard/summary`
- `GET /api/production/summary`

### Herd and Animals

- `GET /api/herd`
- `POST /api/herd`
- `GET /api/herd/:id`
- `PATCH /api/herd/:id`
- `GET /api/animals/:id`
- `PATCH /api/animals/:id`
- `GET /api/animals/:id/milk-history`

### Operations

- `POST /api/operations/cows/<cow_id>/milk`
- `POST /api/operations/livestock/<cow_id>/milk`
- `POST /api/operations/semen-inventory`
- `GET /api/operations/semen-inventory`
- `POST /api/operations/breeding-logs`
- `PUT /api/operations/breeding-logs/<log_id>/status`
- `GET /api/operations/breeding/performance`

### Clinical

- `POST /api/clinical/cows/<cow_id>/medical`
- `POST /api/clinical/livestock/<cow_id>/medical`
- `PUT /api/clinical/cows/<cow_id>/hardlock`
- `PUT /api/clinical/livestock/<cow_id>/hardlock`
- `POST /api/clinical/vet-visits`
- `GET /api/clinical/vet-visits`
- `PUT /api/clinical/vet-visits/<visit_id>/follow-up/schedule`
- `PUT /api/clinical/vet-visits/<visit_id>/follow-up/complete`
- `GET /api/clinical/vet-visits/follow-ups/pending`

### Inventory

- `POST /api/v1/inventory/deduct`
- `GET /api/inventory/items`
- `POST /api/inventory/items`
- `PATCH /api/inventory/items/:id`
- `DELETE /api/inventory/items/:id`
- `GET /api/inventory/movements`
- `POST /api/inventory/movements`
- `GET /api/inventory/stock`

### Finance

- `GET /api/finance/unit-cost`
- `GET /api/finance/customers`
- `POST /api/finance/customers`
- `GET /api/finance/customers/:id`
- `POST /api/finance/billing/stk-push`
- `POST /api/finance/mpesa/callback`
- `GET /api/finance/ledger`
- `POST /api/finance/ledger`
- `GET /api/finance/buyers`
- `POST /api/finance/buyers`
- `GET /api/finance/buyers/:buyerId`
- `PATCH /api/finance/buyers/:buyerId`
- `GET /api/finance/statements/:token`

### Export

- `GET /api/v1/export/animal/<animal_id>/pdf`

### Feed

- `POST /api/v1/feed/calculate-schedule`
- `GET /api/feed/recipes`
- `POST /api/feed/recipes`
- `PATCH /api/feed/recipes/:id`
- `DELETE /api/feed/recipes/:id`
- `POST /api/feed/formulate`
- `GET /api/units/conversions`
- `POST /api/units/conversions`
- `GET /api/feed/costing`

### Nutrition

- `POST /api/v1/nutrition/batches`
- `POST /api/v1/nutrition/batches/<batch_id>/consumption-events`
- `GET /api/v1/nutrition/analytics/feed-cost-efficiency`
- `GET /api/v1/nutrition/analytics/active-batch-roi-trend-weekly`
- `GET /api/nutrition/dashboard`

### Herdsman

- `POST /api/v1/tasks/<routine_id>/complete`

### Health

- `GET /health`

## Build-Wide Notes

The backend now exposes the canonical build-wide routes for auth/session hydration, dashboard production totals, herd and animal detail, inventory registry, nutrition screens, safety dashboard, and finance customers/ledger. The frontend should prefer the canonical paths listed above and keep the `api/v1` prefixed routes as aliases where they still exist.

## Transport Rules

- `Authorization: Bearer <token>` is required for protected routes.
- `X-Tenant-ID` and `X-Farm-ID` must scope every tenant-aware request.
- Mutations should be replay-safe because the frontend uses an offline queue.

## 1. Auth and Session

### `POST /api/auth/login`

Returns the user session, role, and tenant/farm scope.

### `POST /api/auth/logout`

Invalidates the session token.

### `GET /api/auth/me`

Returns the active user, permissions, and current scope.

## 2. Dashboard

### `GET /api/v1/dashboard/summary`

Returns the top-level business summary for the active farm.

Expected fields:

- production totals
- revenue totals
- feed cost totals
- net margin
- operational alerts

### `GET /api/production/summary`

Returns production KPI data for the dashboard cards.

### `GET /api/finance/unit-cost`

Returns the unit cost and margin inputs used by the dashboard.

## 3. Operations

### Production

- `GET /api/production/yield`
- `POST /api/production/yield`
- `GET /api/production/yield/:id`
- `DELETE /api/production/yield/:id`

### Herd and Animal Records

- `GET /api/herd`
- `GET /api/herd/:id`
- `POST /api/herd`
- `PATCH /api/herd/:id`
- `GET /api/animals/:id`
- `PATCH /api/animals/:id`
- `GET /api/animals/:id/milk-history`

### Breeding

- `GET /api/breeding`
- `POST /api/breeding`
- `PATCH /api/breeding/:id`

### Milk Lab and Clerk Entry

- `GET /api/lab/entries`
- `POST /api/lab/entries`
- `GET /api/clerk/entries`
- `POST /api/clerk/entries`

### Safety, Medical, and Routine

- `GET /api/safety/dashboard`
- `GET /api/medical/records`
- `POST /api/medical/records`
- `GET /api/routine/plans`
- `POST /api/routine/plans`

## 4. Nutrition

### Feed Dashboard and Formulation

- `GET /api/nutrition/dashboard`
- `GET /api/feed/recipes`
- `POST /api/feed/recipes`
- `PATCH /api/feed/recipes/:id`
- `DELETE /api/feed/recipes/:id`
- `POST /api/feed/formulate`

### Units and Cost Inputs

- `GET /api/units/conversions`
- `POST /api/units/conversions`
- `GET /api/feed/costing`

The backend should own conversion and costing rules so the frontend does not infer them locally.

## 5. Inventory

### Registry and Stock Flows

- `GET /api/inventory/items`
- `POST /api/inventory/items`
- `PATCH /api/inventory/items/:id`
- `GET /api/inventory/movements`
- `POST /api/inventory/movements`
- `GET /api/inventory/stock`

## 6. Finance

### Ledger and Buyers

- `GET /api/finance/ledger`
- `POST /api/finance/ledger`
- `GET /api/finance/buyers`
- `POST /api/finance/buyers`
- `GET /api/finance/buyers/:buyerId`
- `PATCH /api/finance/buyers/:buyerId`

### Customer Profiles and Statements

- `GET /api/finance/customers`
- `GET /api/finance/customers/:id`
- `GET /api/finance/statements/:token`

The statement route must be token-safe and read-only for the external portal.

## 7. Human Resources

### Staff Registry

- `GET /api/hr/staff`
- `GET /api/hr/staff/:id`
- `POST /api/hr/staff`
- `PATCH /api/hr/staff/:id`
- `DELETE /api/hr/staff/:id` if supported by policy

### Verification

- `POST /api/hr/staff/:id/verify-return`

### Payroll

- `POST /api/hr/payroll/runs`
- `GET /api/hr/payroll/runs`
- `GET /api/hr/payroll/runs/:id`

## 8. Cross-Cutting Backend Expectations

- Every route should enforce tenant and farm isolation.
- Every mutable action should return a stable, typed response shape.
- Validation errors should be structured and field-specific.
- The backend should support paging and filtering on list endpoints.
- Audit events should be recorded for state changes that affect operations, finance, and compliance.
- Where the UI expects computed metrics, the backend should return the final numbers rather than leaving them to client-side inference.
