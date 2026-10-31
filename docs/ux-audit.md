# Maziwa Smart: Perceived-Speed and State-Handling UX Audit

**Scope:** `jivu-frontend` (React 19 + Vite PWA), audited read-only on 2026-10-31 at commit `982521c` plus the uncommitted landing-page work.
**Lens:** Kenyan dairy farmers on low-end Android phones with weak or intermittent connections, paying in KSh, mostly through M-Pesa.
**Last updated:** 2026-10-31, after fixes 1–3 from the top-5 list (see [Progress since the audit](#progress-since-the-audit)).

### Legend

Badges use only colours from the app's theme palette (`tailwind.config.js` → `brand`, `warning`, `danger`, `ink`).

| Status | Meaning |
|---|---|
| ![Implemented](https://img.shields.io/badge/-Implemented-0369A1?style=flat-square) | Works as intended (`brand` #0369A1) |
| ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) | Exists but has gaps (`warning.dark` #D97706) |
| ![Missing](https://img.shields.io/badge/-Missing-EF4444?style=flat-square) | Absent or works against the user (`danger` #EF4444) |
| ![Fixed](https://img.shields.io/badge/-Fixed-0369A1?style=flat-square) | A finding resolved after the audit (`brand` #0369A1) |

| Effort | Meaning |
|---|---|
| ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square) | Under a day, local change (`brand.accent` #38BDF8) |
| ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square) | 1–3 days, touches several screens (`brand` #0369A1) |
| ![L](https://img.shields.io/badge/-L-0C4A6E?style=flat-square) | Cross-cutting, needs backend or design work (`brand.dark` #0C4A6E) |

### Key findings

1. ![Fixed](https://img.shields.io/badge/-Fixed-0369A1?style=flat-square) ~~**Opening the app offline logs the farmer out.** The session check at start-up clears the stored session on any failure, including "no network". Most of the offline work is lost at that point.~~
2. ![Fixed](https://img.shields.io/badge/-Fixed-0369A1?style=flat-square) ~~**Offline money actions are reported as completed.** Ledger entries, expense corrections, customer records and **payroll payments** are silently queued offline, then reported as done ("Payroll run paid successfully.").~~
3. ![Fixed](https://img.shields.io/badge/-Fixed-0369A1?style=flat-square) ~~**The milk log and medical records screens never read their own loading or error state.** On a slow or failed load they say "No … match the selected filters", which looks like data loss.~~
4. **No error boundary is mounted.** Any render crash shows a blank white screen. *(Still open.)*

### Progress since the audit

| Fix | What changed | Where |
|---|---|---|
| 1. Keep farmers signed in offline ![Fixed](https://img.shields.io/badge/-Fixed-0369A1?style=flat-square) | The app opens straight from the saved session and verifies it with `/auth/me` in the background. Only a 401 or 403 ends the session; no network, timeouts, 5xx errors and malformed responses keep the farmer signed in. The full-screen "Verifying access…" no longer appears when a saved session exists. | `src/contexts/AuthContext.jsx:10, 22-62`; tests in `src/contexts/__tests__/AuthContext.test.jsx` |
| 2. No false success for money actions ![Fixed](https://img.shields.io/badge/-Fixed-0369A1?style=flat-square) | Payroll (run, finalize, pay) and expense corrections are online-only, so offline they fail with the connection error instead of queueing. Ledger entries and new or edited customers may still queue, but now say "Saved on this phone. It will be sent when you're back online." instead of a success toast. | `src/lib/offlinePolicy.js:7-8, 15, 28-30`; `src/pages/finance/FinancialLedger.jsx:253`; `src/pages/operations/Customers.jsx:35`; `src/pages/finance/BuyersList.jsx:66`; tests in `src/lib/__tests__/apiClientOffline.test.js` |
| 3. Real loading and error states on the milk log and medical records ![Fixed](https://img.shields.io/badge/-Fixed-0369A1?style=flat-square) | Skeleton rows (table) and skeleton cards (phone) while loading. A load error says what went wrong with a **Try again** button. Offline with nothing cached says the records aren't on this phone yet and will load when the connection returns. A failed refresh keeps the cached rows visible under a "Showing … saved on this phone" notice. A first-time empty list ("No milk recorded yet") is now distinct from filters that match nothing. The summary cards above each list (total volume, open cases and so on) show a skeleton while loading and "—" when the list couldn't load, instead of a false 0. Verified in the browser against the local backend (desktop and phone width: loaded, loading, failed, and recovery after **Try again**). | Shared `src/components/ui/ListLoadState.jsx` and `src/lib/listLoadState.js`; `src/pages/operations/productionLog.jsx:144-156, 606-611`; `src/pages/operations/MedicalRecords.jsx:84-96`; tests in `src/pages/operations/__tests__/ListLoadStates.test.jsx` |

**Not covered by these fixes, still open:**
- `requestWithFallback` (`src/lib/backendApi.js:90-111`) also tries the alternative URL on *network* errors, not only on 404/405/501. On a weak connection, each failed medical list load makes two requests, each with a 10 s timeout, and React Query retries the pair twice. That's up to about a minute before the error appears (see item 11).
- Offline, payroll and expense corrections fail with the generic "We couldn't reach the server…" error, which doesn't say that nothing was paid or changed.
- A token the server rejects mid-session still signs the farmer out without saving what they'd typed (item 14).
- `ListLoadState` is reusable, but milk history, the ledger and the breeding chart still show text-only loading (item 2).

---

## A. Speed tricks

### 1. Instant feedback (optimistic UI) ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square)

**Evidence**
- Milk logging is *not* optimistic. It waits for the server, then shows "Saved". On a network error it falls back to the device queue with honest copy ("Saved to device. Will sync when internet returns.") (`src/components/operations/FastMilkLog.jsx:262-357`, copy at `:339`). Idempotency keys protect retries (`:275`, `src/lib/apiClient.js:27-31`).
- A real optimistic pattern with rollback exists in one place: dismissing herdsman priority alerts removes the alert at once, offers Undo, persists after the undo window, and restores the alert on failure (`src/pages/operations/HerdsmanView.jsx:42-70`).
- Inventory mutations are commented "Optimistically update the cache", but they update the cache in `onSuccess`, after the server replies (`src/pages/inventory/InventoryRegistry.jsx:34-39, 52-59, 78-93`). They are post-confirmation updates, not optimistic ones. Restock has no `onError` at all (`:70-98`).
- A global pending count exists (`src/components/ui/OfflineIndicator.jsx:55-59`), but no record carries its own **pending/synced** badge. A queued milk entry never appears in the milk list until it syncs.
- **Money actions:**
  - Customer payments are correctly online-only (`src/lib/offlinePolicy.js:5` matches `/finance/customers/:id/payments`).
  - Every other money-related write is replayable. The response interceptor turns the network failure into a fake `202 { queued: true }` (`src/lib/apiClient.js:88-123`). Callers can't tell this apart from success:
    - `POST /finance/ledger`: toast "Transaction logged successfully!" (`src/pages/finance/FinancialLedger.jsx:247-253`)
    - `POST /finance/transactions/:id/void-and-replace`: "Expense corrected. The original entry is now voided." (`:570-574`)
    - `POST /hr/payroll/runs/:id/pay`: **"Payroll run paid successfully."** (`src/pages/hr/Payroll.jsx:268-275`, endpoint `src/lib/backendApi.js:991-993`)

**Gap:** money writes are effectively "optimistic without telling anyone". Milk entries, the action that would benefit most from instant feedback, aren't optimistic, and queued records have no per-row pending state.

> **Update (fix 2):** the money-action part of this gap is resolved. Payroll and void-and-replace are online-only, and queued ledger and customer writes now say they're saved on the phone rather than done. The milk log is still not optimistic and still has no per-row pending tag.

**Fix:**
- Add `/finance/ledger`, `/finance/transactions/`, `/hr/payroll` and `/buyers` to `ONLINE_ONLY_PATHS`, or make every caller check `response.data.queued` and say "Saved on this phone – not yet sent".
- Make the milk log optimistic: insert a row tagged `pending`, then flip it to `synced` or `needs attention` from the queue events.

### 2. Skeleton screens ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square)

**Evidence**
- A shared `Skeleton` with shimmer that respects `prefers-reduced-motion` (`src/components/ui/Skeleton.jsx:3-12`). It's used well on:
  - Herd summary and table rows (`src/pages/operations/HerdRegistry.jsx:520-532, 734-762`)
  - Command Center, Buyers list, Customer profile
  - Animal record summary (`src/components/operations/animalRecord/AnimalSummaryCards.jsx:21-22`)
  - Reports, as a card grid (`src/pages/operations/OperationsReportsPage.jsx:459-465`)
- Text-only placeholders:
  - Milk history: "Loading milk history…" (`src/pages/operations/MilkHistory.jsx:329-330`)
  - Ledger: "Loading transactions..." (`src/pages/finance/FinancialLedger.jsx:736-737, 795`)
  - Breeding chart (`src/pages/operations/BreedingHub.jsx:712`)
- **No loading state at all:**
  - Milk log rows (`src/pages/operations/productionLog.jsx:142-149`, which never reads `isLoading`)
  - Medical records (`src/pages/operations/MedicalRecords.jsx:82-90`)

  Both render their "no results" message while the data is still loading (`productionLog.jsx:673-678`, `MedicalRecords.jsx:719-726`).

**Gap:** the two most-used daily screens, milk log and health records, show a false empty state instead of a skeleton.

> **Update (fix 3):** milk log and medical records now show skeleton rows or cards while loading, and only show "no results" once data has arrived. Milk history, the ledger and the breeding chart are still text-only.

**Fix:** reuse `Skeleton` rows in `productionLog`, `MedicalRecords`, `MilkHistory` and `FinancialLedger`, and gate the "no results" message on `!isLoading && !isError`.

### 3. Progressive image loading ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square)

**Evidence:** cow photos appear in only two places, and both have fixed-size containers, so there's no layout jump:
- Edit modal: `h-20 w-20` (`src/pages/operations/HerdRegistry.jsx:1080-1086`)
- Animal record avatar: `h-16 w-16`, with a skeleton while the record loads (`src/components/operations/animalRecord/AnimalSummaryCards.jsx:20-24`)

Neither `<img>` sets `loading="lazy"`, `decoding="async"`, `width`/`height` or `srcset`. There's no blurred or low-res preview and no thumbnail endpoint, so a full-size photo (up to 3 MB, `src/lib/animalPhoto.js:2`) downloads to fill a 64 px circle.

**Gap:** data cost, not layout. A farmer opening one animal record can spend megabytes on a thumbnail.

**Fix:** add `loading="lazy" decoding="async" width height`. Request a server-side thumbnail (for example `?w=128`), or compress on upload (see 5). Show the initials avatar (already there as a fallback) until `onLoad`.

### 4. Progress bars ![Missing](https://img.shields.io/badge/-Missing-EF4444?style=flat-square) ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square)

**Evidence:** there are no `<progress>`, `role="progressbar"` or `onUploadProgress` usages anywhere in `src/`.
- **No fake or time-based bars were found.** The only timer-driven UI is an honest 5-second undo countdown before an inventory log is written (`src/pages/nutrition/StandardBatchLog.jsx:66-85`, also `src/components/dashboard/StandardBatchLog.jsx:29`). Neither copy is mounted by any route, so it's currently dead code.
- `AlertBanner` explicitly documents "ticking seconds, not a progress bar" (`src/components/ui/AlertBanner.jsx:53`).
- Sync shows only a spinner (`OfflineIndicator.jsx:60-62`), not "2 of 5 sent", even though the flush loop knows the count (`src/lib/offlineQueue.js:50-71`).

**Gap:** the one place real progress matters, photo upload, has none (see 5 and 11).

**Fix:**
- Wire axios `onUploadProgress` into the photo upload button.
- Emit `{ done, total }` from `offlineQueue.flush` and show "Sending 2 of 5…".

### 5. Early upload ![Missing](https://img.shields.io/badge/-Missing-EF4444?style=flat-square) ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square)

**Evidence:** choosing a photo only validates type and size (`src/pages/operations/HerdRegistry.jsx:348-360`). Upload starts when the farmer presses a separate button (`:362-389`). The file is sent as-is, with no resize or compression (`src/lib/backendApi.js:1164-1167`). Photo uploads are `FormData`, so they are never queued offline (`src/lib/offlineMutationStore.js:35-36`) and simply fail when there's no signal.

**Gap:** not starting the upload early is the *right* default on metered bundles. The real gaps are:
- no client-side compression
- a 10-second request timeout (`src/lib/apiClient.js:21`) that a 3 MB upload on 2G/3G will usually exceed
- no offline retry for photos

**Fix:**
- Resize to about 1280 px longest side and around 200 KB JPEG/WebP in the browser before upload.
- Give uploads their own timeout (or none) with real progress.
- Optionally start the *compressed* upload on selection **only when on Wi-Fi or unmetered** (`navigator.connection?.saveData` / `effectiveType`), and cancel it if the form is abandoned.

### 6. Busy-search feedback ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square)

**Evidence:** most searches filter already-loaded data in memory, so results are instant:
- Herd matches on ear tag, name, breed and status (`src/lib/herdUtils.js:119-134`). It shows a **real** count: "Showing {visibleHerd.length} of {herdState.length} animals." (`src/pages/operations/HerdRegistry.jsx:883`)
- Ledger, buyers, staff, milk history and medical records also filter in memory.

The one server-side search, Reports, debounces 500 ms (`src/pages/operations/OperationsReportsPage.jsx:194-212`) and then shows the full skeleton grid again (`:459-465`). It gives no "Searching for '…'" or result count until data returns.

**Gap:** nothing misrepresents numbers. Server search lacks an inline busy indicator, and most lists don't show a result count.

**Fix:** add "Searching…" next to the Reports search box while the debounced request is in flight, and reuse the herd "Showing X of Y" line on ledger, milk log and medical lists.

---

## B. States

### 7. Empty state ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square)

**Evidence**
- Herd separates "Your herd is empty. Add your first animal!" from "No animals match your filters", with a **Clear filters** button (`src/pages/operations/HerdRegistry.jsx:763-786`). There's no **Add animal** button inside the empty state, though; the farmer has to find it in the page header.
- Ledger distinguishes "No transactions recorded yet." from "No transactions match…" but offers no action (`src/pages/finance/FinancialLedger.jsx:789, 813`).
- Good guidance:
  - Routine planner: "Add tasks in the planner and save them…" (`src/pages/operations/DailyRoutinePlanner.jsx:108`)
  - Payroll: "Create the first run to calculate staff payments." (`src/pages/hr/Payroll.jsx:328`)
- Plain text with no next step:
  - Inventory: "No inventory items are available yet." (`src/pages/inventory/InventoryRegistry.jsx:279`)
  - Semen inventory (`src/pages/operations/BreedingHub.jsx:325`)
  - Milk drop alerts (`src/pages/operations/MilkDropReports.jsx:132`)

**Fix:** put the primary action button (Add cow, Log milk, Record expense, Add item) inside every first-time empty state.

### 8. Loading state ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square)

**Evidence**
- **Full-screen blocking text on every start:** "Verifying access…" (`src/App.jsx:59-70`) stays up until `GET /auth/me`, then the tenant profile, return. That's up to 10 s each on a timeout (`src/contexts/AuthContext.jsx:17-80`).
- Every lazy route shows a full-screen "Loading route…" text (`src/App.jsx:78-88`) instead of keeping the layout and sidebar on screen.
- See item 2 for screens with no loading state at all.

**Gap:** a farmer on 2G sees a blank page with grey text twice before any content, even though a 7-day cached copy of their data is already on the device (`src/providers/QueryProvider.jsx:76-84`).

> **Update (fix 1):** with a saved session the app now renders immediately and verifies in the background, so "Verifying access…" only appears on a first sign-in. The full-screen "Loading route…" fallback is unchanged.

**Fix:**
- Render the app with the stored session immediately and validate `/auth/me` in the background.
- Move the `Suspense` boundary inside `DashboardLayout`, so only the content area shows a skeleton.

### 9. Error state ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square)

**Evidence**
- **Strong central mapping:** `getApiErrorMessage` (`src/lib/backendApi.js:340-389`) turns network, 400/422, 401, 403, 404, 409, 429 and 5xx into plain, actionable copy, and filters out SQL and stack-trace text. Most screens use it.
- **No error boundary is mounted.** `ErrorBoundary` and `RootErrorBoundary` exist (`src/components/errors/`) but are never imported by `main.jsx` or `App.jsx` (`src/main.jsx:32-52`). An uncaught render error gives a white screen.
- When an error boundary is mounted, its copy is the generic "Something went wrong" (`src/components/errors/ErrorBoundary.jsx:57-62`).
- Generic messages that don't say what went wrong:
  - Milk log: "Failed to save. Try again." (`src/components/operations/FastMilkLog.jsx:355`)
  - Ledger: an error rendered as "Error: …" (`src/pages/finance/FinancialLedger.jsx:795`)
- **Silent failures:**
  - ~~Milk log rows: the error is only logged to the console~~ (fixed by fix 3)
  - ~~Medical records: the error isn't read at all~~ (fixed by fix 3)
  - Inventory restock: no `onError` (`src/pages/inventory/InventoryRegistry.jsx:70-98`)
  - `AddBuyerForm`: `console.error` only (`src/pages/finance/AddBuyerForm.jsx:44-47`); this component isn't mounted on any route.
- **M-Pesa:**
  - There's no STK-push or Daraja flow in the frontend. M-Pesa appears only as a payment-method option plus a manually typed reference code (`src/pages/finance/FinancialLedger.jsx:352-356`).
  - The reference is required for non-cash customer payments (`:293`), but its **format is never checked** (M-Pesa codes are 10 uppercase letters and digits).
  - Offline payment attempts correctly fail rather than queue (`src/lib/offlinePolicy.js:3-5`). The farmer then sees the generic "We couldn't reach the server…" with no hint that *no payment was recorded*.

**Fix:**
- Mount `RootErrorBoundary` around `<App/>`, with farmer-friendly copy and a "Reload" button.
- Replace the generic messages above.
- Validate M-Pesa codes inline (`/^[A-Z0-9]{10}$/` after upper-casing).
- On a payment failure, say explicitly "Payment not recorded – nothing was saved".

### 10. No internet ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) ![L](https://img.shields.io/badge/-L-0C4A6E?style=flat-square)

**Evidence (good foundations)**
- **PWA:** the Workbox service worker precaches the app shell, with SPA navigation fallback to `/app.html` (`vite.config.js:63-74`). The manifest has `start_url: /app` (`vite.config.js:47-62`), and the service worker is registered in `src/main.jsx:17`.
- **Cached reads:** the React Query cache persists to IndexedDB via localforage for 7 days, scoped per user, tenant and farm (`src/providers/QueryProvider.jsx:10-21, 44-84`).
- **Write queue:** network-failed mutations are stored in IndexedDB with idempotency keys and scope (`src/lib/offlineMutationStore.js:45-60`, `src/lib/apiClient.js:88-123`). They retry with exponential backoff (`src/lib/offlineQueue.js:5-48`), flush on the `online` event and at start-up (`src/providers/QueryProvider.jsx:61-74`), and can be inspected, retried or removed (`src/components/ui/OfflineQueueInspector.jsx`).

**Evidence (gaps)**
- ~~**Critical:**~~ **Fixed (fix 1).** At start-up, any failure of `authApi.me()`, *including no network*, ran `clearSession()` (`src/contexts/AuthContext.jsx:20-44`). The durable copy in IndexedDB is deleted (`src/lib/sessionStore.js:51-54`), so a farmer who opens the app in the milking shed is sent to `/login`, and logging in needs the network. Queued entries remain, but they are scoped to an actor who can no longer sign in offline.
- The status shows only as a small cloud icon in the header. The "Online/Offline" word is `hidden sm:inline` (`src/components/ui/OfflineIndicator.jsx:53-54`), so **phones only see the icon**. No banner explains what still works, for example "You can keep recording milk; payments need internet".
- Retry backoff is only re-checked when `flush()` runs: on start-up, on the `online` event, or when the farmer taps the button. An item that failed with a 5xx while online is **never retried** until the next reconnect or reload, because there's no timer.
- Removing a queued item is a single tap with no confirmation (`OfflineQueueInspector.jsx:45-48, 74-80`). A farmer can delete an unsynced milk record by accident.
- Workbox `runtimeCaching: []` (`vite.config.js:74`), so cow photos and other assets fetched at runtime aren't available offline.

**Fix:**
- Treat network errors in bootstrap as "keep the cached session, mark it unverified".
- Add a dismissible offline banner with plain "what works" copy.
- Schedule `flush()` at `min(nextAttemptAt)`.
- Confirm before deleting queued items.
- Add a `CacheFirst` runtime rule for `/uploads/` images.

### 11. Slow network ![Missing](https://img.shields.io/badge/-Missing-EF4444?style=flat-square) ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square)

**Evidence**
- Every client uses a fixed `timeout: 10000` (`src/lib/apiClient.js:21`, `src/lib/backendApi.js:14, 43`), uploads included. Queries `retry: 2` (`src/providers/QueryProvider.jsx:38`), so a slow read can take about 30 s before any message appears.
- `requestWithFallback` retries alias URLs on network errors (`src/lib/backendApi.js:90-93`, `!status` counts as aliasable), doubling the wait on endpoints with fallbacks, such as medical records, when the connection is down. Found while testing fix 3.
- There's no "This is taking longer than usual…" message, no progress during long requests, and no reduced-data mode. `navigator.connection` and `saveData` are never read.
- The landing page is static and light (about 9 KB gzipped). The app bundle precaches about 1.9 MB through the service worker on first visit.

**Fix:**
- Show an inline "Still working – slow connection" hint after about 4 s of pending.
- Lengthen the upload timeout.
- Add a "Data saver" setting: no photos, no charts, and skip background `refetchOnMount`. Default it on when `navigator.connection.saveData` is true.

### 12. No search results ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square)

**Evidence**
- Herd: "No animals match your filters" plus **Clear filters** (`src/pages/operations/HerdRegistry.jsx:770-781`).
- Medical records give search hints ("Try … searching by cow tag, diagnosis, status, or vet.") with a Clear button (`src/pages/operations/MedicalRecords.jsx:726-728`).
- Matching is a plain case-insensitive substring (`src/lib/herdUtils.js:123-127`). It has no tolerance for typos ("Neema" vs "Nema"), doesn't normalise ear tags ("KE-012" vs "ke012"), and offers no "Did you mean…" or closest cows.

**Fix:** normalise tags (strip spaces, dashes and case, like `normalizeEarTag` already does for input). On zero results, show the three closest names or tags by edit distance as tappable suggestions.

### 13. Permission denied ![Missing](https://img.shields.io/badge/-Missing-EF4444?style=flat-square) ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square)

**Evidence**
- There are no `getUserMedia`, Geolocation, Notification or `navigator.permissions` calls anywhere.
- Photos use a plain file input without `capture` (`src/pages/operations/HerdRegistry.jsx:1095-1100`), so Android shows the system picker and there's no camera permission prompt to handle.
- The one permission-like API, clipboard and share for receipts, has a fallback chain and a clear failure toast (`src/lib/receipt.js:55-63`, `src/pages/finance/FinancialLedger.jsx:612-618`).

**Gap:** nothing is broken today. If camera capture, location tagging or push reminders (heat or calving alerts) are added, no denial pattern exists yet.

**Fix:** add `capture="environment"` to the photo input, which uses the OS camera with no app-level permission. Before any future permission request, show a pre-prompt explaining why, plus a working fallback.

### 14. Session expired ![Missing](https://img.shields.io/badge/-Missing-EF4444?style=flat-square) ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square)

**Evidence**
- There's no global 401/403 response interceptor. `apiClient` only handles network failures (`src/lib/apiClient.js:88-123`). A token that expires mid-session gives a per-request toast, "Your session may have expired. Sign in again, then retry." (`src/lib/backendApi.js:382`), but the user stays "signed in" in the UI and each later action fails the same way.
- Form input isn't persisted anywhere. There are no drafts for milk, ledger, medical or employee forms (only the mix-builder templates use `localStorage`, `src/components/nutrition/MixBuilder.jsx:230`). If the farmer reloads or logs in again, the entry is gone.
- Logout doesn't warn about unsynced changes (`src/layouts/Header.jsx:27-28`, `src/contexts/AuthContext.jsx:142-155`).
- The messages themselves are calm and clear (`src/lib/authErrorMessages.js`).

**Fix:**
- Add one 401 interceptor that keeps the current page mounted and opens a re-login sheet over it, then retries the failed request.
- Save in-progress form state to `sessionStorage` per form key.
- Block logout with "3 changes haven't been sent yet" when the queue isn't empty.

### 15. Form validation ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square)

**Evidence**
- **Good:**
  - The employee form uses a Kenyan-mobile normaliser (`0712…`, `254712…`, `+254 712…`) with an inline, per-field example hint ("Enter a valid Kenyan mobile number, for example 0712 345 678.") and `aria-invalid` (`src/lib/staffAccessForm.js:35-56`, `src/components/forms/AddEmployeeModal.jsx:137-138`).
  - The herd form uses rule-based per-field validation (`src/pages/operations/HerdRegistry.jsx:175`).
- **Weak:**
  - Customer and buyer phone fields are only `type="tel" required`, with no format check (`src/components/finance/CustomerForm.jsx:157-166`).
  - The shared `ValidationRules.phoneNumber` accepts any 8+ digits, spaces or symbols (`src/lib/validation.js:62-66`).
  - Registration validates after submit with a banner, not per field (`src/pages/auth/RegisterPage.jsx:81-92`).
  - The milk log reports errors in a single message line, not next to the field (`src/components/operations/FastMilkLog.jsx:363-373`).
- **Submit button state:**
  - Every submit button disables while saving, which is good: `isSubmitting`, `isPending` or `isSaving`.
  - The ledger form also disables Submit while `isFormInvalid` (`src/pages/finance/FinancialLedger.jsx:299, 505`) without saying which field is wrong. A farmer sees a dead button.

**Fix:**
- Promote `normalizeKenyanPhone` to the shared validator and use it in Customer, Buyer and Register forms.
- Keep Submit enabled, and on press scroll to and mark the first invalid field.
- Add `inputMode="decimal"` to litre and KSh fields.

### 16. Success state ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square)

**Evidence**
- **Good:** the milk log shows "Saved" for 1.4 s, clears the form and refocuses the input for the next cow (`src/components/operations/FastMilkLog.jsx:291-306`). That's the right next step for rapid entry. Duplicate entries get a clear "Already recorded… Duplicate blocked." (`:312-322`).
- ~~**Misleading:**~~ **Fixed (fix 2).** Success toasts fired for queued (unsent) money and customer actions:
  - "Payroll run paid successfully." (`src/pages/hr/Payroll.jsx:274`)
  - "Transaction logged successfully!" (`src/pages/finance/FinancialLedger.jsx:252`)
  - "Customer created successfully!" (`src/pages/operations/Customers.jsx:34`)
- Herd screens show success twice, as a toast *and* an inline banner (`src/pages/operations/HerdRegistry.jsx:69-70`), which is noisy on small screens.
- Success toasts rarely suggest the next step, for example "Expense saved – view today's total".

**Fix:**
- Branch every success handler on `queued`.
- Use one success channel per screen.
- Add a next-step link to key confirmations.

---

## Summary

| # | Item | Status | Effort |
|---|---|---|---|
| 1 | Instant feedback (optimistic UI) | ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) | ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square) |
| 2 | Skeleton screens | ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) | ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square) |
| 3 | Progressive image loading | ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) | ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square) |
| 4 | Progress bars | ![Missing](https://img.shields.io/badge/-Missing-EF4444?style=flat-square) (none fake) | ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square) |
| 5 | Early upload | ![Missing](https://img.shields.io/badge/-Missing-EF4444?style=flat-square) | ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square) |
| 6 | Busy-search feedback | ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) | ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square) |
| 7 | Empty state | ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) | ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square) |
| 8 | Loading state | ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) | ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square) |
| 9 | Error state (incl. M-Pesa) | ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) | ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square) |
| 10 | No internet | ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) | ![L](https://img.shields.io/badge/-L-0C4A6E?style=flat-square) |
| 11 | Slow network | ![Missing](https://img.shields.io/badge/-Missing-EF4444?style=flat-square) | ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square) |
| 12 | No search results | ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) | ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square) |
| 13 | Permission denied | ![Missing](https://img.shields.io/badge/-Missing-EF4444?style=flat-square) (not used yet) | ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square) |
| 14 | Session expired | ![Missing](https://img.shields.io/badge/-Missing-EF4444?style=flat-square) | ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square) |
| 15 | Form validation | ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) | ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square) |
| 16 | Success state | ![Partial](https://img.shields.io/badge/-Partial-D97706?style=flat-square) | ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square) |

No item is fully **Implemented**. The offline-write foundation (item 10) is the strongest area and the best place to build from.

## Top 5 fixes for farmers on weak networks (priority order)

1. ![Fixed](https://img.shields.io/badge/-Fixed-0369A1?style=flat-square) **Keep farmers signed in offline** (`src/contexts/AuthContext.jsx:20-44`). Don't clear the session when `/auth/me` fails for network reasons; render from the stored session and verify in the background. Today the offline queue and 7-day cache are unreachable for anyone who opens the app without signal. ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square)
2. ![Fixed](https://img.shields.io/badge/-Fixed-0369A1?style=flat-square) **Stop reporting queued money actions as done.** Make ledger, void-and-replace, payroll and customer writes online-only, or label them "Saved on this phone – not sent yet". Payroll "paid successfully" while offline is the most harmful message in the app. ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square)
3. ![Fixed](https://img.shields.io/badge/-Fixed-0369A1?style=flat-square) **Give the milk log and medical records real loading and error states.** Replace the false "no entries match" with skeleton rows and a retry message, so farmers don't think records were lost and log them twice. ![S](https://img.shields.io/badge/-S-38BDF8?style=flat-square)
4. **Show offline and sync state in words on phones.** Add a slim offline banner ("No internet – milk records will be saved on this phone") and a per-row pending/synced tag on queued milk entries. Retry queued items on a timer, not only on reconnect. ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square)
5. **Compress photos and fix request timeouts.** Resize photos before upload, give uploads real progress and a longer timeout, and add a "still working…" hint on slow reads. ![M](https://img.shields.io/badge/-M-0369A1?style=flat-square)

## Things that work against good practice

| Pattern | Where | Why it hurts |
|---|---|---|
| ~~**Logged out when offline**~~ Fixed (fix 1) | `src/contexts/AuthContext.jsx:39-44` | Deletes the stored session on a network error; offline use becomes impossible after a restart |
| ~~**False success on queued money**~~ Fixed (fix 2) | `src/lib/apiClient.js:88-123` → `src/pages/hr/Payroll.jsx:274`, `src/pages/finance/FinancialLedger.jsx:252`, `src/pages/operations/Customers.jsx:34` | Farmer believes staff were paid or a sale was recorded when nothing reached the server |
| **Silent failures** (milk log and medical records fixed by fix 3) | `src/pages/inventory/InventoryRegistry.jsx:70-98`, `src/pages/finance/AddBuyerForm.jsx:44-47` | Errors are logged to the console only; the screen looks empty or the action looks done |
| ~~**Loading shown as "no results"**~~ Fixed (fix 3) | `productionLog.jsx:673-678`, `MedicalRecords.jsx:719-726` | Looks like data loss on a slow connection |
| **Full-page text spinners** | `src/App.jsx:59-70` ("Verifying access…"), `src/App.jsx:78-88` ("Loading route…") | Blank screen on every start and every first visit to a section, even with cached data |
| **White screen on crash** | No error boundary mounted (`src/main.jsx:32-52`) | Any render error loses the whole app with no recovery button |
| **Input lost on session expiry or logout** | No drafts; no 401 interceptor; logout ignores the pending queue (`src/layouts/Header.jsx:27-28`) | Typed records vanish; unsynced changes are stranded after logout |
| **Retries only on reconnect** | `src/lib/offlineQueue.js:50-71`, `src/providers/QueryProvider.jsx:61-74` | Items that hit a server error stay "pending" indefinitely while the phone stays online |
| **One-tap delete of unsynced records** | `src/components/ui/OfflineQueueInspector.jsx:45-48, 74-80` | Accidental data loss with no confirmation |
| **Dead submit button** | `src/pages/finance/FinancialLedger.jsx:299, 505` | Disabled without saying which field is wrong |
| **Undefined colour classes** | `text-danger-800` in `OfflineQueueInspector.jsx:67, 77` (the palette defines `danger` 50/100/500/900 only) | Sync error text and delete icon render without the intended danger colour |
| **Off-palette colours** | 650 uses of `rose-*`, `emerald-*`, `slate-*` or `gray-*` across 71 files (for example `ErrorBoundary.jsx:51-52`, `OperationsReportsPage.jsx:463, 468`, `Payroll.jsx:316`) | Error and success states look different on every screen; states aren't recognisable at a glance |

No fake or time-based progress bars were found.

## Manual test checklist

Run on a mid-range Android phone (Chrome) or Chrome DevTools device mode. Sign in as a single-farm owner with at least 10 cows and some ledger history.

**Slow 3G (DevTools → Network → "Slow 3G")**
- [ ] Cold-load `/app`. Note the time spent on "Verifying access…" and "Loading route…" before content appears.
- [ ] Open Milk log and Medical records. Does any "No … match" message appear before data arrives? (Fixed: expect skeleton rows, then data. On failure, "Couldn't load …" with **Try again**.)
- [ ] Search the herd for a tag; confirm the "Showing X of Y" count updates and is correct.
- [ ] Upload a 3 MB cow photo. Is there progress? Does it fail at about 10 s with a clear message?
- [ ] Open Reports and type in search. Is there any "searching" feedback during the 500 ms debounce and the request?

**Go offline mid-entry (DevTools → "Offline", or airplane mode)**
- [ ] Partway through the milk log form, go offline and press Save. Expect "Saved to device…". Check that the header count increases, and whether the entry appears in the list.
- [ ] Record an expense in the Ledger while offline. Note the exact toast. (Fixed: expect "Saved on this phone. It will be sent when you're back online.")
- [ ] Finalize, then **Pay** a payroll run while offline. Note the toast. (Fixed: expect an error toast, "We couldn't reach the server…", and the run stays unpaid.)
- [ ] With the phone still offline, **close and reopen the app**. Are you still signed in? (Fixed: expect to stay signed in, with cached data visible.)
- [ ] Go back online. Confirm the queue drains, the count reaches 0 and the entries appear in their lists.
- [ ] Open the sync panel and tap the bin on a queued item. Was there a confirmation?

**Expire the token**
- [ ] In DevTools → Application → Session Storage, edit `jivu_user.token` to an invalid value. Then, without reloading, submit a milk entry and a ledger entry.
- [ ] Note the message. Are you offered a way to sign in again without losing the typed values?
- [ ] Reload with the invalid token. Note where you land and whether any typed data survives.
- [ ] Queue an offline entry, then press **Log out**. Were you warned about unsynced changes?

**Deny camera permission**
- [ ] Chrome site settings → Camera → Block. Open a cow → Edit → choose photo. Confirm the picker still offers gallery and files. Today this is a plain file input, so no permission prompt appears.
- [ ] If camera capture is added later, repeat and confirm there's an explanation and a gallery fallback.

**Invalid phone number**
- [ ] Add employee with phone `12345`. Expect an inline Kenyan-format hint under the field.
- [ ] Add customer (Buyers → Add) with phone `12345`. (Expected today: accepted, with no format check.)
- [ ] Register with an empty phone. Note that the error appears as a banner, not on the field.
- [ ] Enter `0712 345 678`, `254712345678` and `+254 712 345 678`. All three should be accepted and saved in one consistent format.

**Simulate a failed M-Pesa payment**
- [ ] Ledger → Income → Customer payment → method **M-Pesa**. Try saving with a blank reference, then with an invalid one such as `abc`. (Expected today: blank is blocked, `abc` is accepted.)
- [ ] While offline, record the same customer payment. Confirm it is **not** queued and the message makes clear nothing was recorded.
- [ ] Use DevTools request blocking on `/finance/customers/*/payments` to return 500. Confirm the error says the payment was not saved and suggests what to do next.
- [ ] Once an STK-push flow exists, re-test with the following and check that each has distinct, plain-language copy:
  - the farmer cancelling the M-Pesa prompt
  - a wrong PIN
  - insufficient funds
  - a timeout with no callback
