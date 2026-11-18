# Maziwa Smart: frontend

The web app for Maziwa Smart, a dairy farm management system for Kenyan farms and
cooperatives. Farmers and their staff record milk, manage the herd, feeding, stock, buyers,
money and staff, from a phone, in English or Kiswahili, including when the connection drops.

This repo holds two things built together by Vite:

- **The landing page** (`/`): a static marketing page generated at build time from
  `src/landing/`.
- **The app** (`/app.html` and every signed-in route): a React single-page app, installable as
  a PWA.

The backend is a separate Flask API (`../../backend` in the monorepo). **The backend is the
source of truth**: this app shows what the API sends and never invents business data. Where a
value is missing it shows "—", and the gap is written up in
[BACKEND_REQUESTS.md](BACKEND_REQUESTS.md).

---

## What the app covers

| Area | Pages |
|---|---|
| Daily work | Dashboard, Production Log (milk records), milk usage, daily routine, farm task view |
| Herd | Cow register, animal records, breeding and AI history, medical records, milk-drop alerts |
| Feeding | Today's feeding, feed stock and costs, feed mixes, ingredients, calf milk planner, unit helpers |
| Money and supply | Buyers, customers, ledger with receipts, stock |
| Reports | Farm reports, buyer value, cow profitability, milk inventory, milk safety |
| People | Staff register, app access, advances, payroll |
| Cooperatives | Member onboarding, cooperative and platform admin |

Across the app:

- **Phone first.** Every screen is checked at 360px wide. Tables turn into cards on small screens.
- **Works offline.** Milk records and other daily work are saved on the phone and sent when the
  connection returns. Money and payroll need a connection.
- **English and Kiswahili.** Chosen on the sign-in screens or in the profile menu.
- **Plans and access.** Pages a user's role or plan doesn't include are hidden or shown locked.
  Hiding is a convenience only; the backend enforces access.

---

## Getting started

**Requires** Node.js 20.19 or newer and npm. The version is pinned in `.nvmrc`, and `.npmrc`
refuses to install on an older Node. A running backend is needed for real data (see
[Environment](#environment)).

```bash
nvm use
npm install
npm run dev
```

The landing page opens at <http://localhost:5173>; sign in or register from there.

To see the Command Center with figures when your local database has no recent milk, put
`VITE_MOCK_DASHBOARD=full` (or `empty`, `negative`) in `.env.development.local` and restart
`npm run dev`. Only the dashboard's summary and trend requests are mocked; `?mock=empty` in the
address switches scenario without a restart. Builds never include it (`src/dev/mockDashboard.js`).

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build of the landing page and the app into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm test` | Unit and component tests (Vitest): watch mode in a terminal, single run in CI. `npx vitest run` for one run. |
| `npm run test:watch` | Tests in watch mode |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Phone-sized Playwright journeys against a built app with a mocked backend |
| `npm run test:e2e:full` | The same journeys against a real backend (`E2E_BASE_URL`, default `http://localhost:5173`) |
| `npm run images` | Regenerates the landing page's AVIF, WebP and JPEG photo sizes (needs ImageMagick 7 or 6.9.12+) |

Before opening a pull request, run `npx vitest run`, `npm run lint` and `npm run build`.

---

## Environment

Variables are read at build time. Put local values in `.env.local`, which git ignores.
`.env.production` is committed and holds only public values.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Backend address. `/api` is added if missing. Production uses `https://api.maziwasmart.co.ke`. |
| `VITE_FEATURE_PLAN_INDICATORS` | on | Demo banner and locked-feature cards |
| `VITE_FEATURE_CUSTOMER_DELETE` | off | Delete on the Customers page. Turn on once the backend route exists (BR-007). |
| `VITE_FEATURE_CUSTOMER_PORTAL` | off | Shared buyer statement page. **Keep off** until statement links use private tokens (BR-016). |
| `VITE_FEATURE_KISWAHILI` | on | The English / Kiswahili switch. Off keeps the app in English. |

Flags take `true` or `false`; see [src/lib/featureFlags.js](src/lib/featureFlags.js).

Never put secrets in a `VITE_` variable: everything in them is shipped to the browser.

---

## Project layout

```
src/
  App.jsx              Routes, sign-in gates and page access
  main.jsx             App entry (React Query, auth, theme)
  landing/             Landing page: content, templates and the Vite plugin that renders it
  pages/               Routed pages, by area (operations, finance, inventory, nutrition, hr, auth, ...)
  components/
    ui/                Shared building blocks: BaseModal, Confirmation, list load states, FieldError, ...
    data/              Toolbar, filters, tables
    periods/           Week / Month / Year totals and date-grouped lists
    <area>/            Components for one area (operations, finance, inventory, nutrition, forms)
  layouts/             App shell: header, sidebar, phone bottom bar, page access gate
  hooks/               Shared hooks (see below)
  lib/                 API client, offline queue, formatting and other plain functions
  i18n/                Text in English and Kiswahili
  providers/           React Query setup and query keys
  contexts/            Auth and tenant contexts
e2e/                   Playwright journeys and the mock backend they use
docs/                  Backend contracts, endpoint map, UX audit
```

---

## How things work

### Talking to the backend

All requests go through one client, [src/lib/apiClient.js](src/lib/apiClient.js). It adds the
sign-in token, the `X-Tenant-ID` and `X-Farm-ID` headers, and an `Idempotency-Key` on writes so a
retried save is never recorded twice. Endpoint helpers live in
[src/lib/backendApi.js](src/lib/backendApi.js). Do not create a second HTTP client.

Errors are worded by the backend's error **code**, never by its message text, so the same problem
reads the same everywhere and in both languages (`getApiErrorMessage`). Validation errors that name
a field appear under that field (`useServerFieldErrors`).

### Keeping farms apart

A user can belong to several farms, and several people can share a phone. Query keys, cached data,
form drafts and offline records are always scoped by tenant and farm (see `QUERY_KEYS` in
[src/providers/QueryProvider.jsx](src/providers/QueryProvider.jsx)). Phone numbers, tokens and
balances never go in URLs, logs or unscoped storage. The only unscoped setting stored on the device
is the language choice.

### Offline

Daily-work writes made offline go into a queue on the phone
([src/lib/offlineQueue.js](src/lib/offlineQueue.js)) and are sent when the connection returns.
[src/lib/offlinePolicy.js](src/lib/offlinePolicy.js) decides which writes may be queued; money and
payroll may not. The header shows how many changes are waiting, and lets the user review them.

### Languages

Each area's text lives in `src/i18n/<area>.en.js` with a Kiswahili sibling `<area>.sw.js`, and
`<area>.js` serves the current language:

```js
import { productionCopy as copy } from '../../i18n/production';
<h1>{copy.title}</h1>
```

A key missing from the Kiswahili file falls back to English, so a page can be translated a piece at a
time. A test checks that every Kiswahili key exists in English. Lines marked `// REVIEW` are best
translations awaiting a native speaker's check.

Pages not yet translated keep their English text in the component. New pages should put their text
in `src/i18n/` from the start.

### Shared pieces to reuse

| Need | Use |
|---|---|
| A dialog | `components/ui/BaseModal` (Escape, focus kept inside, optional form mode) |
| A yes/no or type-to-confirm prompt | `components/ui/Confirmation` with `useConfirmation()` |
| List loading, offline and error states | `components/ui/ListLoadState` with `getListLoadState()` |
| Filters that survive Back and reload | `hooks/useUrlFilters` (never for names or phone numbers) |
| Server validation under each field | `hooks/useServerFieldErrors` with `components/ui/FieldError` |
| Saving a half-filled form | `hooks/useFormDraft` |
| Who sees a menu link | `lib/navAccess.js` and `lib/roles.js` |
| Kenyan phone numbers | `lib/phone.js` |
| Dates (day first, both languages) | `lib/dateFormat.js` |

---

## Testing

- **Unit and component tests** sit next to the code in `__tests__` folders and run with Vitest
  and Testing Library.
- **End-to-end journeys** in `e2e/` run at phone size in Playwright. The `phone-mocked` project
  builds the app and serves a mock backend from `e2e/support/mockBackend.js`.
- On a busy machine, Vitest can time out; `npx vitest run --maxWorkers=3` helps.

---

## Working on the backend contract

- [BACKEND_REQUESTS.md](BACKEND_REQUESTS.md): every change the frontend needs from the API, with
  the exact request, response and error codes. Start with its "Start here" section.
- [docs/contracts/period-totals.md](docs/contracts/period-totals.md): the period totals API.
- [docs/backend-integration-contract.md](docs/backend-integration-contract.md) and
  [docs/backend-endpoint-map.md](docs/backend-endpoint-map.md): endpoints by page.

Code waiting on the backend is marked `TODO(BR-0xx)`.

---

## Contributing

- Branch from `development`; open pull requests into `main`.
- Commit messages follow Conventional Commits: `feat(scope): ...`, `fix(scope): ...`,
  `docs: ...`, `chore: ...`. One logical change per commit.
- User-visible changes get an entry in [CHANGELOG.md](CHANGELOG.md), written for farmers.
- Large user-visible changes go behind a feature flag.
- Ask before adding a dependency.

---

## License

Proprietary. All rights reserved.
