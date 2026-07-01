# Backend Endpoint Map

This map translates the routed `jivu-frontend` build into backend responsibilities. It is intentionally build-wide, not HR-only.

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
