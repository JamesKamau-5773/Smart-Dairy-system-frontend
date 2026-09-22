# Backend Integration Contract

This repository treats the entire `jivu-frontend` application as backend-linked product UI. The backend is not a feature slice target; it is the source of truth for the full build: auth, tenant/farm isolation, dashboard telemetry, operations, nutrition, finance, inventory, external customer views, staff, payroll, leave, verification, and audit workflows.

## Frontend Transport Contract

The shared HTTP client sends:

- `Authorization: Bearer <token>` from `sessionStorage.jivu_user`
- `X-Tenant-ID` from `tenantRef.tenantId`
- `X-Farm-ID` from `tenantRef.farmId`

The backend must accept those headers on every protected request and enforce tenant/farm isolation server-side.

The frontend uses React Query for server state and an offline queue for deferred writes, so the backend must provide stable, replay-safe endpoints for mutations that may be retried.

## Build-Wide Backend Surface

The routed frontend currently depends on backend support for these application areas:

- authentication and session bootstrap
- dashboard summaries and operational KPIs
- production logging, milk trends, and milk history
- herd registry, herd detail, and animal records
- breeding workflows and herd management actions
- milk lab and clerking utilities
- nutrition dashboards, feed formulation, and unit conversion support
- inventory registry and supply movements
- finance ledger, buyers, customer profiles, and statement views
- safety and medical/compliance dashboards
- staff registry and payroll
- customer portal statement access via tokenized public links

Each area should have a predictable resource model, server validation, and stable response shapes so the UI can remain thin and orchestration-focused.

## Core Domain Areas

### 1. Staff Registry

The backend must own the canonical staff record and return these fields at minimum:

- `id`
- `userId` / `user_id`, nullable until an account invitation is created
- `accountStatus` / `account_status` with values `NONE`, `INVITED`, `ACTIVE`
- `name`
- `phoneNumber` / `phone_number`
- `role`
- `status` with values `ACTIVE`, `ON_LEAVE`, `OVERDUE`, `INACTIVE`
- `baseSalary`
- `loanBalance`
- `monthlyDeduction`
- `leaveType`
- `leaveStartDate`
- `leaveEndDate` or `expectedReturnDate`
- `actualReturnDate`
- `unpaidLeaveDaysThisMonth`
- `medicalCertifications`
- `medicalNotes`
- `returnVerifiedAt`
- `returnVerificationDecision`
- `returnVerificationNote`

Employee records and login accounts are linked by the backend through `Employee.user_id`. The frontend submits the employee ID to an onboarding endpoint and must not create or infer a second account locally.

### Staff Account Onboarding

`POST /api/onboarding/invite`

Request:

```json
{
  "employee_id": 7,
  "role": "FARM_HAND"
}
```

The response includes the server-issued claim URL. Claim links expire after 48 hours, may be reissued while the account is `INVITE_PENDING`, and cannot be reused after activation.

`POST /api/onboarding/provision`

```json
{
  "employee_id": 7,
  "role": "FARM_HAND",
  "password": "temporary-password",
  "requires_password_reset": true
}
```

Direct provisioning returns the backend-created linked account with `ACTIVE` status. The frontend never stores the temporary password and blocks all protected routes while the authenticated session has `requires_password_reset: true`. Password completion is submitted to `POST /api/auth/change-password`; only the returned backend session may clear the checkpoint.

`role` must be one of `FARM_ADMIN`, `FARM_MANAGER`, `FARM_SUPERVISOR`, `FARM_HAND`, or `VETERINARY_DOCTOR`.

### Staffing Recommendations

`GET /api/hr/staffing-recommendations`

Returns the tenant's active `employee_count`, `farm_size`, a `recommended_roles` object, `advisory_only: true`, and a policy note. These values are guidance only; account permissions remain explicitly assigned. The frontend must render this response rather than calculate local staffing bands.

Role inheritance is consistent across API authorization and frontend route checks: `FARM_MANAGER` inherits supervisor and farmhand access, while `FARM_SUPERVISOR` inherits farmhand access.

### 2. Verification Workflow

The frontend expects overdue employees to be verified through a dedicated action, not a generic profile update.

Required backend behavior:

- accept a verify-return mutation for a specific staff member
- record whether the person returned
- record the note entered by the operator
- transition `OVERDUE -> ACTIVE` when the employee returned
- keep or restore `OVERDUE` when the employee did not return
- timestamp and audit the decision

### 3. Payroll Workflow

Payroll must be server-calculated or server-confirmed.

The backend should return:

- approved leave days
- overdue penalty days
- leave deduction
- advance deduction
- gross pay
- net pay
- payroll run metadata

The frontend can display the breakdown, but the backend must be the source of truth for the calculation.

## Module Contracts Beyond HR

### Dashboard

The dashboard needs aggregate summaries across the active farm and tenant, including production, finance, and operational signal cards. The backend should expose a single summary endpoint plus narrow endpoints for any drill-down widgets.

### Operations

Production, herd, breeding, lab, milk history, safety, records, and routine planning all depend on read/write endpoints that are scoped by farm and date range. The backend should support list, detail, create, update, and delete flows where the UI exposes them.

### Nutrition

Feed dashboards and formulation screens need recipe, ingredient, unit, and profitability data. The backend should provide deterministic conversion and cost inputs so the UI does not invent calculations locally.

### Inventory and Finance

Inventory, buyers, ledger, and customer profile screens depend on transaction histories, balances, and statement data. The backend should support paging, filtering, and tokenized statement access where the external portal needs it.

Milk deliveries are a distinct resource from generic ledger entries: the frontend logs `liters_delivered` and `personal_consumption_liters` per customer per day (`/api/finance/deliveries`, see [backend-endpoint-map.md](backend-endpoint-map.md)), and the backend must compute `billable_liters` and `amount` (`billable_liters * agreed rate`) rather than trusting client-side arithmetic, then keep the customer's balance/ledger in sync. Deliveries must support update and delete, not just create — the frontend gives users edit/delete controls that call these endpoints directly, with no local-only fallback.

### External Portal

The customer portal uses a public/shared token route. The backend must validate the token, restrict the response to the correct statement scope, and keep the payload read-only.

### WhatsApp Interactive Messaging

Jivu Smart Dairy should treat WhatsApp as a guided command surface, not as a free-form chat parser. The backend must own the conversation state and the command routing, while the frontend-side concept of a menu or button becomes a stable intent id in the webhook payload.

Required backend behavior:

- send interactive list messages for top-level navigation such as Log Milk, Feed, Herd, and Reports
- send interactive buttons for short follow-up choices such as Yes/No, Confirm/Cancel, Morning/Afternoon/Evening
- parse the `interactive` object from Meta webhook payloads and read the tapped option `id`, not the display label
- map each option id to a canonical backend command such as `log_milk`, `record_feed`, `open_menu`, or `confirm_action`
- keep conversation state server-side so the next question depends on the previous selection and the user does not have to retype context
- deduplicate webhook events using Meta message ids so button retries do not create duplicate farm actions
- enforce tenant, farm, and role scoping before executing any command
- return a plain text or interactive follow-up message after each step, depending on the workflow branch
- keep menu content and command ids stable so retries, translations, and UI label changes do not break workflows

The backend should not treat the visible button text as authoritative. Only the stable ids should drive business logic.

Suggested message flow:

1. User sends `Menu` or taps the persistent menu entry.
2. Backend replies with an interactive list message.
3. User taps `Log Milk`.
4. Backend stores the selected command in conversation state and replies with a button or list prompt such as cow selection or session choice.
5. User taps the follow-up button.
6. Backend completes the workflow, persists the record, and returns a confirmation message.

Enterprise-grade criteria for this feature:

- webhook verification via Meta challenge handling
- signed or authenticated webhook processing
- idempotent command execution
- clear audit trail for every chat-driven action
- rate limiting and abuse protection
- explicit fallback path when Meta interactive payloads are unavailable and text input is used instead

## Suggested API Shape

### Staff

`GET /api/hr/staff`

Returns the full staff collection for the active tenant and farm.

`GET /api/hr/staff/:id`

Returns one staff record plus audit-relevant leave and verification fields.

`POST /api/hr/staff`

Creates a staff record.

`PATCH /api/hr/staff/:id`

Updates profile, finance, and leave fields that are not part of a verification action.

### Verify Return

`POST /api/hr/staff/:id/verify-return`

Request:

```json
{
  "returned": true,
  "note": "Employee reported back to duty"
}
```

Response:

```json
{
  "id": "staff_123",
  "status": "ACTIVE",
  "actualReturnDate": "2026-07-01",
  "returnVerifiedAt": "2026-07-01T10:15:00.000Z",
  "returnVerificationDecision": "YES",
  "returnVerificationNote": "Employee reported back to duty"
}
```

### Payroll

`POST /api/hr/payroll/runs`

Returns a payroll run with line items for every staff member.

The line items should include the leave split so the frontend can render approved leave versus overdue penalty days without recomputing them locally.

### Calf Milk Feeding

`POST /api/production/milk-dispositions`

```json
{
  "type": "CALF_FEED",
  "calf_id": 12,
  "liters": 3.5,
  "date": "2026-09-15",
  "notes": "Morning feeding"
}
```

`GET /api/production/milk-dispositions` returns the active tenant's disposition history and accepts optional `date` and `calf_id` filters.

The backend is authoritative for calf eligibility, available milk, tenant isolation, and remaining-milk calculations. The frontend must refresh disposition and dashboard queries after a successful write rather than adjusting inventory locally.

### Dashboard and Operations

The frontend already expects endpoints such as:

- `/api/production/summary`
- `/api/v1/dashboard/summary`
- `/api/finance/unit-cost`

The backend may map those paths differently, but it must provide equivalent farm-scoped summaries and keep the shapes stable.

### WhatsApp Webhook and Messaging

The backend should expose a WhatsApp webhook endpoint pair for Meta Cloud API integration:

- `GET /api/whatsapp/webhook` for verification challenge responses
- `POST /api/whatsapp/webhook` for inbound message events, button taps, and list selections

For outbound replies, the backend should call the Meta Cloud API using stable template ids and interactive payload definitions. The backend must persist the conversation state that determines which interactive prompt comes next.

For a route-by-route breakdown, see [backend-endpoint-map.md](backend-endpoint-map.md).

If the backend prefers the exact route inventory already supplied by the server team, the frontend can treat singular/plural resource names as aliases as long as the response shapes stay identical.

## Backend Rules the Frontend Depends On

- `ACTIVE` is the default working state.
- `ON_LEAVE` means an approved leave state with start and return dates.
- `OVERDUE` means the employee has not returned by the expected return date and requires verification.
- Verification is a separate workflow from profile edits.
- Payroll deduction logic must be deterministic and auditable.
- All mutations should return structured errors with validation messages.
- Changes should be idempotent or safely retryable where possible.

## Enterprise Grade Criteria

The build becomes enterprise grade when the backend provides:

- authoritative state transitions
- audit logging for leave, verification, and payroll actions
- multi-tenant isolation using the headers above
- server-side validation and calculation
- stable response shapes for registry, drawer, verification, and payroll screens
- role-aware access control for HR and finance operations
- module-level authorization for operations, finance, inventory, nutrition, and external portal access
- retry-safe mutation handling for offline queue replay
