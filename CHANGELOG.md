# Changelog

What changed for farmers and staff using Maziwa Smart. Newest first.

## Unreleased

### Shared statements and buyer list

- **Shared statement links are switched off for now.** The statement page showed made-up details
  (a 0 balance, "Monthly (Net 30)", "Verified" deliveries) because it didn't read what the server
  sends, and the server finds a statement by the buyer's phone number, so anyone with a number
  could see that buyer's account. The page now says links aren't available yet and asks the
  buyer to request their statement on WhatsApp. When it is switched back on
  (`VITE_FEATURE_CUSTOMER_PORTAL=true`, only after BR-016), it shows only the server's own
  figures, "—" for anything missing, and a clear message for an invalid link.
- The **"Import from Excel"** button on an empty buyer list is gone: it did nothing.

### Small fixes

- **Delete is hidden on the Customers page** until the server can delete customers (it always
  failed before). Turned back on with `VITE_FEATURE_CUSTOMER_DELETE=true` once that is ready.
- **Statements shared on WhatsApp say "Maziwa Smart"**, not the old "Jivu Smart Dairy" name.
- **Fits on small phones:** the "Add to Feedstore" button no longer runs off the card, and the
  milk form puts the date and the Morning / Midday / Evening choice on their own rows so neither
  is cut off.

### Plan locks by area

- **Areas outside the farm's plan explain themselves.** When the server says a plan doesn't
  include an area (e.g. Payroll or Reports), every page in that area shows "isn't in your plan"
  with how to upgrade, instead of the page. Which areas each plan includes is decided by the
  server alone; until it sends that, nothing is locked. Switched off with the same
  `VITE_FEATURE_PLAN_INDICATORS=false` setting.

### Phase 5 — Plan, limits and demo (UX audit)

- **Ready for plans and the demo farm.** When the server starts sending a farm's plan, the app will:
  mark the demo farm with a "Demo farm" banner on every page; show a clear "isn't in your plan"
  card with how to upgrade for features the plan doesn't include; and explain plan limits,
  ended subscriptions and demo restrictions in plain words when the server refuses a change.
  Until then nothing changes for farmers: no plan is assumed and nothing is locked.
- Receipt photo limits (size and number per entry) follow the server's figures once it sends them.
- These indicators can be switched off with the `VITE_FEATURE_PLAN_INDICATORS=false` build setting.

### Phase 4 follow-ups

- **Unit helpers work.** Saving a unit helper never reached the server: the page sent a free-text
  material name, but the server needs the stock item it applies to. You now choose the feed or
  stock item, name the unit (e.g. Kasuku) and say how many kilograms it holds. The Farm Task View
  uses these saved unit helpers to show feed amounts.
- **The dashboard chart loads faster.** It now asks the server for daily milk totals for the range
  you pick, instead of downloading every milk record ever logged. A day with no milk recorded shows
  as a gap ("No milk recorded") rather than 0 L, and the chart says when it couldn't load.
- **Reports show "—" for missing figures** instead of 0 (milk, money and buyer totals).
- The cow list is downloaded once and shared by every screen (it was downloaded twice).

### Phase 4 — Figures from the farm's records, not the phone (UX audit)

- **Counts and totals come from the server.** Today's milk, cows milked and average per cow on
  the dashboard; the herd's total, milking and dry counts (now for the whole herd, not just the
  first 200 cows); a cow's average, peak and total milk; and the litres behind milk milestones.
  If the server can't be reached they show "—" instead of a number worked out on the phone.
- **Lists stay in step with the server.** The Cow Register, medical records, the breeding page's
  semen tank and the unit helpers now always show what the server has. Adding, restocking or
  removing semen straws refreshes the list from the server.
- **No more "empty" when it failed.** The Cow Register, semen inventory and pending vet checks
  say "Couldn't load …" with **Try again** instead of "Your herd is empty" or "All inseminated
  cows have been checked".
- **Unit helpers no longer keep a copy on the phone.** Removing a unit helper isn't possible
  yet (it only looked removed before). *(Correction: saving them still didn't work against the
  server; fixed in "Phase 4 follow-ups" above.)*
- **Reports load like the rest of the app**: kept for offline use, retried on a weak connection,
  with **Try again** when they can't load.

### Phase 3 — Safer deletes, a real "page not found", clearer errors (UX audit)

- **Type to confirm.** Deleting a cow, a customer or a stock item now asks you to type its tag
  or name first, so a slip of the thumb can't remove it. Pressing Escape closes the dialog.
- **See what's at stake.** Deleting a customer shows whether they still owe money, have
  credit, or have a settled account.
- **Deletes need a connection.** Deleting a cow, customer or stock item now only happens while
  you're online, and if there's no connection you're told nothing was deleted. Edits made
  offline are still saved on the phone as before.
- **"We couldn't find that page."** A mistyped or old link now says so, with **Go to your
  dashboard** and **Go back**, instead of silently jumping to another page. Signed out, it offers
  **Go to log in**.
- **Errors you can see.** Failures that used to be silent now tell you: switching farms
  ("You're still on the same farm"), loading the dam list when adding a cow, downloading an
  animal's record, deleting or verifying milk records.
- The sign-in screens recover from an unexpected error with **Try again** instead of a blank
  page.

### Phase 2 — Honest loading, error and empty states (UX audit)

- **"Nothing here" now only means nothing here.** Stock, milk drop alerts, customers, buyers,
  the feed dashboard, the daily routine, the herdsman's plan and both profit reports show a
  placeholder while loading, a clear "Couldn't load …" with **Try again** when the connection
  fails, and "You're offline…" when there's no connection, instead of claiming the list is
  empty.
- **Unknown figures show "—", never 0.** Balances, rates, stock levels, litres and profit
  figures the server didn't send are shown as "—". The buyers' **Total Outstanding** shows "—"
  if any buyer's balance is unknown, and an item with an unknown stock level is no longer
  labelled "Low – reorder".
- **The daily routine comes from the farm's records.** The planner and the herdsman's
  **Today's Plan** now show the routine saved on the server, so every phone sees the same plan.
  Unsaved checklist edits are kept on the phone as a clearly marked draft until you tap
  **Save Routine**; saving needs a connection, and a failed save tells you and keeps your
  edits.
- **Better first-time screens.** Customers: "No customers yet" with **Add your first
  customer**; a search with no matches offers **Clear search**.
- Pages and sign-in screens show a placeholder shaped like the page while they open, instead
  of a line of flashing text.

### Phase 1 — Data integrity (UX audit)

- **No more double milk records.** Tapping **Save Record** twice (or pressing Enter and tapping)
  now saves the milking once. The button shows "Saving..." and can't be pressed again until the
  save finishes.
- **Retrying is safe.** If a save fails and you press Save again without changing anything, it
  is matched to the first try, so the milking is never recorded twice, including when it is
  kept on the phone and sent later.
- **Editing a milk record no longer risks losing it.** Changes are saved to the same record
  instead of deleting it and adding a new one. When editing, the cow is shown but can't be
  changed; to move milk to another cow, delete the record and record it again.
- **Clearer delete.** Deleting a milk record asks in an in-app dialog that shows which record
  (cow, session, date, litres), with **Keep** and **Delete** buttons. When you're offline it says
  the record will be deleted when you're back online, instead of saying it is already deleted.
- **Customer forms** (Buyers list and Customer management) now disable Save while saving, so a
  double tap can't create the same customer twice.
- Error messages from the server (for example "Amount must be greater than 0.") are shown on
  the milk form instead of a generic "Failed to save".
