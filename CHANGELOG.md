# Changelog

What changed for farmers and staff using Maziwa Smart. Newest first.

## Unreleased

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
