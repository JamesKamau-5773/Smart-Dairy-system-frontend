# Smart Dairy ERP System - Frontend

**jivu-frontend** is a modern React-based dashboard for farm management and dairy operations, featuring real-time production tracking, feed formulation, herd management, and business intelligence.

## Features

### Core Modules
- **HerdsmanView Dashboard** — Live herd status, today's plan, feed mix composition
- **Feed & Nutrition** — Live mix builder with template persistence, profitability charts, recipe management
- **Production Tracking** — Fast milk logging, yield history, medical records  
- **Inventory Management** — Feed formulation, stock registry, buyer tracking
- **Finance** — Ledger, customer profiles, payments
- **HR & Staffing** — Payroll, staff registry

### UI/UX Highlights
- Responsive design with Tailwind CSS
- Dark/light theme toggle
- Offline queue support (PWA-ready)
- Loading skeletons and status indicators
- Modal workflows for intuitive data entry

### Developer Experience
- MSW mocks for realistic API simulation
- Comprehensive test suite (Vitest, 24+ tests)
- React Query for efficient server state management
- Hot module reloading with Vite
- SRP component architecture

### Backend Integration
- Full frontend build integration contract: [docs/backend-integration-contract.md](docs/backend-integration-contract.md)
- Endpoint map by routed module: [docs/backend-endpoint-map.md](docs/backend-endpoint-map.md)
- Shared API client attaches auth plus tenant/farm isolation headers for every protected request

---

## Quick Start

**Prerequisites:** Node.js 18+, npm 9+

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Tests

```bash
npm test                    # Interactive watch mode
npm test -- --run          # Single run (CI mode)
```

### 4. Build for Production

```bash
npm run build              # Build optimized bundle
npm run preview            # Preview production build locally
```

### 5. Lint Code

```bash
npm run lint               # Run ESLint
```

---

## Project Structure

```
src/
├── components/             # Reusable React components
│   ├── ui/                # Generic UI components (Modal, DashboardCard, etc.)
│   ├── nutrition/         # Feed & nutrition (MixBuilder, CurrentMixCard, etc.)
│   ├── operations/        # Operational (FastMilkLog, etc.)
│   └── forms/             # Form components
├── pages/                 # Page-level components (routed)
│   ├── operations/        # HerdsmanView, ProductionLog, etc.
│   ├── inventory/         # FeedFormulation
│   ├── nutrition/         # NutritionDashboard (Feed Dashboard)
│   ├── finance/           # Finance pages
│   └── auth/              # Auth pages
├── layouts/               # Layout components (DashboardLayout, Sidebar, Header)
├── contexts/              # React Context (Auth, Tenant)
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and helpers
│   ├── apiClient.js       # Axios instance and config
│   ├── offlineQueue.js    # Client-side queuing
│   └── ...
├── mocks/                 # MSW handlers and API simulation
├── providers/             # Provider setup (QueryProvider for React Query)
├── styles/                # Global CSS and Tailwind config
└── App.jsx                # Main app + routes
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **UI Framework** | React | 19 |
| **Build Tool** | Vite | 8.0.10 |
| **Styling** | Tailwind CSS | 3.4.19 |
| **Routing** | React Router | v7 |
| **State Mgmt** | @tanstack/react-query | 5.x |
| **HTTP Client** | Axios | Latest |
| **Mocking** | MSW | Latest |
| **Testing** | Vitest | Latest |
| **Icons** | Lucide React | Latest |
| **Linting** | ESLint | Latest |

---

## Architecture Highlights

### Single Responsibility Principle (SRP)
Each component has one job. Example: **Nutrition Dashboard**
- `NutritionDashboard.jsx` — Orchestrator (layout & mock data)
- `CurrentMixCard.jsx` — Mix metrics only
- `ProfitabilityChart.jsx` — Cost trends only
- `TopRecipesList.jsx` — Recipe rankings only
- `DashboardCard.jsx` — Shared UI shell

### State Management Strategy
- **Local State** — React `useState` for UI state (filters, modals, forms)
- **Server State** — React Query for API data, caching, background sync
- **Context** — Auth & Tenant contexts for app-wide settings
- **Offline Queue** — Client-side persistence for offline workflows

### Mock Server (MSW)
Realistic development endpoints:
- `GET /api/inventory/status` — Feed inventory
- `GET /api/production/yield` — Production history
- `DELETE /api/production/yield/:id` — Idempotent deletion
- `POST /api/feed/batches` — Batch snapshots
- More in [`src/mocks/handlers.js`](src/mocks/handlers.js)

### Testing
- Unit tests for utilities (`src/lib/__tests__/`)
- Component tests for flows (`src/components/**/__tests__/`)
- Mock handler validation (`src/mocks/__tests__/handlers.test.jsx`)
- Layout & navigation tests
- **Total:** 24+ passing tests

---

## Environment & Security

### Environment Variables
Create `.env.local` in project root (excluded from git):

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=Smart Dairy ERP
VITE_LOG_LEVEL=debug
```

### Sensitive Data
Files **excluded from git** (see [`.gitignore`](.gitignore)):
- `.env*` — Environment variables
- `.secrets/` — Credential files
- `*.pem`, `*.key`, `*.crt` — Certificates
- `credentials.json`, `apikeys.json` — API keys
- `node_modules/`, `dist/` — Artifacts

**Never commit secrets, API keys, or credentials to the repository.**

---

## Git & Version Control

### Commit Conventions
Descriptive commit messages:

```
feat: add MixBuilder live formulation component
fix: resolve modal backdrop blur visibility issue
refactor: extract DashboardCard as shared UI shell
docs: update README with architecture guide
test: add handlers.test.jsx for MSW validation
chore: update dependencies
```

### Branch Naming
```
feat/add-analytics-dashboard
fix/production-yield-bug
refactor/optimize-queries
docs/api-documentation
```

---

## Contributing

### 1. Clone & Install
```bash
git clone https://github.com/JamesKamau-5773/Smart-Dairy-system-frontend.git
cd jivu-frontend
npm install --legacy-peer-deps
```

### 2. Create Feature Branch
```bash
git checkout -b feat/your-feature-name
```

### 3. Test & Build
```bash
npm test -- --run     # Verify tests pass
npm run build         # Check for build errors
```

### 4. Commit & Push
```bash
git commit -m "feat: describe your change"
git push origin feat/your-feature-name
```

### 5. Create Pull Request
Open a PR on GitHub and request review.

---

## Troubleshooting

### Peer Dependency Issues
```bash
npm install --legacy-peer-deps
```

### Port Already in Use
Vite will auto-increment to next available port. Check terminal for actual URL.

### MSW Not Intercepting
Ensure `mocks/browser.js` is imported **before** rendering in `src/main.jsx`:
```javascript
import { worker } from './mocks/browser';
await worker.start();
```

### Tests Timeout
For slow environments:
```bash
npm test -- --run --testTimeout=10000
```

---

## Documentation

- **[React Router Docs](https://reactrouter.com/)**
- **[Tailwind CSS](https://tailwindcss.com/)**
- **[React Query](https://tanstack.com/query/latest)**
- **[Vite Docs](https://vitejs.dev/)**
- **[Vitest](https://vitest.dev/)**
- **[MSW (Mock Service Worker)](https://mswjs.io/)**

---

## License

Proprietary — Smart Dairy ERP System (2024-2026)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/JamesKamau-5773/Smart-Dairy-system-frontend/issues)
- **Discussions:** [GitHub Discussions](https://github.com/JamesKamau-5773/Smart-Dairy-system-frontend/discussions)

---

**Made with care by the Smart Dairy Development Team**
