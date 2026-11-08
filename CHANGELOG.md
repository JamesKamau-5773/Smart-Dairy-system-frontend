# Changelog

What changed for farmers and staff using Maziwa Smart. Newest first.

## Unreleased

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
