# Changelog

What changed for farmers and staff using Maziwa Smart. Newest first.

## Unreleased

### A clearer Command Center

- **Daily profit comes first and stands out**: the largest figure on the page, on a highlighted
  card across two columns, then transaction revenue, then today's feed cost. A loss shows in red
  with its minus sign.
- **Page titles and headline figures are bolder** across the app (page titles, money and stat
  figures); labels, body text, forms and tables are unchanged.
- All ten cards are always in the same places. The milk cards sit in one even grid, Total milk
  first and Milk remaining last, without the decorative icons. A figure the server hasn't sent
  shows a grey "—"; while loading, the cards show grey placeholders in the shape of their text.
- Figures show exactly as the server sends them; any negative figure (a loss, or milk remaining
  below zero) is in red with its minus sign.
- Before the day's first milking, a slim "No milking recorded yet today." notice with a
  **Record milk** button sits above the milk cards. Close it and it stays away until the browser
  is closed.
- The daily report's revenue figure has moved behind the info button on Transaction revenue.
- The top bar's Online button and your name are bolder; your role is in capitals.

### One type scale across the whole app (typography phase 6)

- **Sign-in and sign-up, the dashboards, the menus, pop-ups, banners and admin pages use the same
  type scale as the rest of the app.** Nothing in the app is smaller than 12px any more.
- **The top bar names every page as the menu does**, so a customer profile no longer shows a bare
  number and the dashboard reads "Command Center" in the menu, the top bar and the page.
- The phone tab bar's labels are easier to read; "Production Log" wraps onto two lines instead of
  being cut off.
- Dashboard figures and the farm set-up steps are written in sentence case in English and Kiswahili.

### Clearer text on the safety and staff pages (typography phase 5b)

- **Safety Dashboard, Staff Registry and Payroll use the new type scale.** Each title is the page's
  name in the menu ("Safety Dashboard", was "Milk Safety Board"), and nothing is smaller than 12px.
- Field names are in sentence case in English and Kiswahili; the farm size reads "Small farm",
  never a raw code.
- On a phone, the search boxes on Staff Registry, Cow Register, AI & Pregnancy and milk history say
  just "Search", and the search icon no longer sits on top of the text.

### Clearer text on the buyer, stock and report pages (typography phase 5a)

- **Buyer List, Customer Management, customer profiles, Inventory, Customer Value & Profit, Cow
  Profitability and the Milk Inventory Report use the new type scale.** Each title is the page's
  name in the menu: "Buyer List" (was "Customer Billing"), "Cow Profitability" (was "Cost to Raise
  vs. Total Earnings") and "Inventory" (was "Stock Registry").
- Field names, buttons and figures are written in sentence case in English and Kiswahili. On a
  phone, the search boxes say just "Search".
- Cost types and record checks the app has no wording for yet are shown as a sentence, never as a
  raw code.
- In Kiswahili, the Milk Feeding Planner is "Mpango wa Maziwa na Ulishaji" everywhere (the menu
  called it a calf milk plan).

### Clearer text on the operations and feeding pages (typography phase 4)

- **Milk Usage, Daily Routine, Farm Task View, Today's Feeding, Feed Stock & Costs, Feed Mixes,
  the Milk Feeding Planner and Unit Helpers use the new type scale.** Each page title matches
  its name in the menu, and nothing is smaller than 12px.
- Field names, buttons and counts are written in sentence case in English and Kiswahili
  ("Save routine", "2 blocks"). The "Create new feed batch" button is now translated too.
- Feeding groups the app has no name for yet are shown as a sentence, never as a raw code.

### Clearer text on the herd pages (typography phase 3)

- **Cow Register, Breeding, Medical Records, Low milk alerts, the cow record and milk history
  use the new type scale.** Each page title is the page's main heading, summary figures are one
  size, and nothing is smaller than 12px.
- Field names, statuses and buttons are written in sentence case in English and Kiswahili
  ("Save record", "Under treatment", "Mirija 6 kwenye tangi") instead of capitals. Column
  headings and small section headings keep their capitals.
- A status the app has no wording for yet is shown as a sentence ("ON_HOLD" → "On hold") rather
  than as the raw code.
- Pending vet checks and the medical records table no longer squeeze dates and buttons onto
  several lines.

### Clearer text on the Production Log, Ledger and Farm Reports (typography phase 2)

- **The three pages use the new type scale.** Page titles are larger, summary figures are one
  size (20px), and no text on these pages is smaller than 12px. Small grey text such as
  record counts and references went up from 10–11px to 13px.
- **Money is the same size from symbol to decimals.** "KES" and the cents are no longer in
  tiny print; they are only shown in a lighter colour.
- On a phone, the Ledger's summary shows one figure per line so a full amount is never cut
  off.
- Statuses such as "Pending" are written in sentence case in English and Kiswahili, instead of
  being capitalised by the browser.
- Field names above inputs are in sentence case, slightly bolder than the hint text. Only table
  headings and small section headings use capitals.
- **Litres stay large when you record milk.** The litres box keeps its big figures, on phones
  too, and the form's buttons and labels read "Save record", "Morning" and so on.

### One typeface (typography phase 1)

- **The app uses one typeface, Inter, served with the app.** It no longer downloads three fonts
  from Google, so pages show text sooner on a slow connection, and the font is saved for
  offline use. Numbers keep their columns lined up without the separate monospace font.
- Buttons, inputs and table headings share one size and weight. On a phone, every text box is
  16px so the screen doesn't zoom in when you tap it, and search boxes say just "Search" so the
  hint isn't cut off.
- **The Soft / Dense switch in the profile menu is gone.** The app has one typography now; light
  and dark stay. A saved Soft or Dense choice is cleared and the usual theme used.

### The whole app in Kiswahili

- **Every screen now follows the language switch.** Before, only the sidebar, sign-in and a few
  pages changed to Kiswahili. Now the herd, health, AI and pregnancy, milk, feed and stock,
  buyers and money, staff and payroll, reports, admin and onboarding screens do too. Anything
  without a Kiswahili translation yet still shows in English. Saved records (statuses,
  categories, payment methods, recipe names, payroll CSV headings) keep their English codes;
  only how they are shown changes.
- **Gaps now show as "—", not invented numbers.** A buyer's profile showed KES 0.00 when the
  server sent nothing; a new feed batch's protein showed 0%; dates without a value showed "N/A".
  These now show "—". The AI & pregnancy list no longer shows an "Updated" date of today for
  every check (the server doesn't send one yet). It lists checks by AI date instead.
- Dates read day-first everywhere (03 Nov 2026), in the chosen language.

### Milk record fixes

- **Editing a milk record no longer moves it to the morning.** The form didn't recognise the
  session the server sends ("Evening"), so it pre-selected morning; saving without noticing
  changed the session. It now keeps the record's session, and asks you to choose if there is none.
- **The Production Log's afternoon filter works.** It asked the server for "afternoon", which the
  server calls "Midday", so it found nothing.
- **The Production Log's status filter is gone for now.** The server ignores it, so it showed
  every record while looking filtered. It comes back once the server supports it (BR-019).
  Milk kept apart from the batch now shows as "Kept apart" instead of a code.

### Phase 7 — clean-up

- Removed pages, forms and helpers nothing used any more: old buyer, stock and milk-history
  pages, the old buyer form, a second unauthenticated HTTP client (`pages/finance/index.js`), a
  broken keyboard-shortcut hook, the old `Modal`, seven unused form components and their barrel
  file, sample billing data, an unused table wrapper, and the phone-only copy of unit helpers
  with its storage helpers. Nothing a farmer sees changes.

### Phase 7 — quick wins (UX audit)

- **Filters stay put.** The Production Log, cow register, ledger, staff, buyers, a cow's milk
  history and stock lists keep their filters in the page address, so Back, a reload or a shared
  link keeps them. Searches that can hold a person's name or phone number (buyers, staff, ledger,
  milk history) stay off the address on purpose.
- **AI history on phones** shows one card per record instead of a squeezed table.
- **The bottom bar follows the same access rules as the menu**, so Production Log, Buyers and
  Ledger only appear when you can open them.
- The menu says **Maziwa Smart**, and the header shows your role in words ("Farm administrator",
  or in Kiswahili) instead of codes like FARM_ADMIN. The Unit Helpers link now opens the page
  directly and only for the roles that page allows.
- **The phone menu** closes with Escape, keeps the keyboard inside while open, and is hidden from
  keyboards and screen readers while closed.
- **One kind of dialog everywhere.** Forms for employees, ledger entries, stock, deliveries, feed
  batches, milk-drop investigations and receipts now share one frame: Escape closes it, the
  keyboard stays inside, focus returns to where you were, and closing is blocked while saving
  where it was before. A confirmation opened over a form handles its own keys.

### Phase 6 follow-up — more Kiswahili

- **The Production Log is in Kiswahili**, including its totals, filters, the "not sent yet" list
  and recent calf feedings. Session names (asubuhi / mchana / jioni) and dates use Kiswahili
  month and day names ("04 Ago 2026").
- **Shared pieces used on every page are translated:** confirmation dialogs, "couldn't load" and
  "still loading" notices, filter chips, the Week / Month / Year switch, period totals, the
  "please sign in again" sheet, restored drafts, the list of changes saved on this phone and the
  Soft / Dense switch. Pages not yet translated may show these in Kiswahili around English words.
- "Upgrade" now reads "Boresha mpango" in Kiswahili.
- **The Production Log no longer makes up details the server didn't send.** A record without a
  milker, session, date or status shows "—" instead of "SYSTEM", "morning", today's date or
  "Pending".
- Totals labels wrap onto two lines instead of being cut off on small phones.

### Phase 6 — Kiswahili and clearer form errors (UX audit)

- **Kiswahili.** Choose English or Kiswahili on the sign-in screens (EN / SW, top right) or from
  your profile menu. The choice is remembered on the phone. Translated so far: the menus, header,
  bottom bar, connection banner, error and "page not found" screens, plan and demo notices, every
  sign-in, sign-up and password screen, the milk record form, and server and offline messages.
  Other pages are still in English for now. The Kiswahili is awaiting review by a native speaker;
  the switch can be turned off with `VITE_FEATURE_KISWAHILI=false`.
- **Errors appear next to the field they're about** in the milk, customer, employee and ledger
  forms, once the server says which field (BR-017). Changing the field clears its error.
- **Server messages are chosen by their code**, so the same problem reads the same on every page,
  in your language (for example a duplicate milk record, or not enough stock).
- **Phone numbers are checked the same way everywhere.** The cooperative and member invite forms
  now format numbers as you type and send them in the one format the server expects. WhatsApp
  statements open the buyer's chat only when their number is a valid Kenyan mobile.
- The account menu button has a name for screen readers on phones.
- The expense form's cow list belongs to the farm you're in (it was shared across a company's farms).

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
