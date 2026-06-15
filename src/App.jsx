import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { canAccessHerdsmanView } from './lib/permissions';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Auth & Core & Public B2B
import LoginPage from './pages/auth/LoginPage';
import CommandCenter from './pages/CommandCenter';
import RegisterPage from './pages/auth/RegisterPage';
import CustomerPortal from './pages/external/CustomerPortal';

// Operations (Phase 4)
import YieldLog from './pages/operations/productionLog';
// import VeterinaryControl from './pages/operations/VeterinaryControl'; // Obsolete
import SafetyDashboard from './pages/operations/SafetyDashboard';
import MedicalRecords from './pages/operations/MedicalRecords';
import ClerkEntry from './pages/operations/ClerkEntry';
import HerdsmanView from './pages/operations/HerdsmanView';
import HerdRegistry from './pages/operations/HerdRegistry';
import MilkLab from './pages/operations/MilkLab'; // Added Phase 5.4
import BreedingHub from './pages/operations/BreedingHub';
import AnimalPassport from './pages/operations/AnimalRecord';
import MilkHistory from './pages/operations/MilkHistory';
import FeedFormulation from './pages/inventory/FeedFormulation';
import NutritionDashboard from './pages/nutrition/NutritionDashboard';
import UnitConversions from './pages/settings/UnitConversions';
import DailyRoutinePlanner from './pages/operations/DailyRoutinePlanner';

// Finance & Resources (Phase 5)
import FinancialLedger from './pages/finance/FinancialLedger';
import InventoryRegistry from './pages/inventory/InventoryRegistry';
import BuyersList from './pages/finance/BuyersList';
import CustomerProfile from './pages/finance/CustomerProfile';

// HR Module
import StaffRegistry from './pages/hr/StaffRegistry';
import Payroll from './pages/hr/Payroll';

/**
 * PROTECTED ROUTE GATEKEEPER
 * Ensures the 'X-Tenant-ID' context is valid before mounting.
 */
const ProtectedRoute = ({ children }) => {
  const { currentUser, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-warm flex items-center justify-center">
        <div className="glass-panel font-sans font-medium text-ink animate-pulse p-6">
          Verifying access…
        </div>
      </div>
    );
  }
  
  if (!currentUser) return <Navigate to="/login" replace />;
  
  return children;
};

const RouteLoadingFallback = ({ label = 'Loading route…' }) => (
  <div className="min-h-screen bg-surface-warm flex items-center justify-center">
    <div className="font-sans text-sm text-ink-muted animate-pulse">{label}</div>
  </div>
);

const getDefaultRoute = (user) => {
  if (canAccessHerdsmanView(user)) {
    return '/tasks';
  }

  return '/dashboard';
};

const RoleLandingRedirect = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoadingFallback label="Preparing workspace…" />;
  }

  return <Navigate to={getDefaultRoute(currentUser)} replace />;
};

const HerdsmanOnlyRoute = ({ children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoadingFallback label="Checking access…" />;
  }

  if (!canAccessHerdsmanView(currentUser)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/shared/statement/:token" element={<CustomerPortal />} />
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<RoleLandingRedirect />} />
          
          {/* Main Telemetry */}
          <Route path="dashboard" element={<CommandCenter />} />
          
          {/* Production & Biology */}
          <Route path="operations/yield" element={<YieldLog />} />
          <Route path="operations/herd" element={<HerdRegistry />} />
          <Route path="operations/breeding" element={<BreedingHub />} />
          <Route path="operations/clerk" element={<ClerkEntry />} />
          <Route path="tasks" element={<HerdsmanOnlyRoute><HerdsmanView /></HerdsmanOnlyRoute>} />
          <Route path="operations/herdsman" element={<HerdsmanOnlyRoute><HerdsmanView /></HerdsmanOnlyRoute>} />
          <Route path="operations/lab" element={<MilkLab />} />
          <Route path="operations/nutrition" element={<NutritionDashboard />} />
          <Route path="feed-nutrition" element={<NutritionDashboard />} />
          <Route path="operations/routine" element={<DailyRoutinePlanner />} />
          {/* <Route path="operations/veterinary" element={<VeterinaryControl />} /> */}
          <Route path="operations/safety" element={<SafetyDashboard />} />
          <Route path="operations/records" element={<MedicalRecords />} />
          <Route path="operations/animal/:id/milk-history" element={<MilkHistory />} />
          <Route path="operations/animal/:id" element={<AnimalPassport />} />
          {/* Capital & Inventory */}
          <Route path="finance/ledger" element={<FinancialLedger />} />
          <Route path="operations/inventory" element={<InventoryRegistry />} />
          <Route path="operations/feed-formulation" element={<FeedFormulation />} />
          <Route path="feed-nutrition/mix" element={<FeedFormulation />} />
          <Route path="operations/schedule-planner" element={<Navigate to="/operations/routine" replace />} />
          <Route path="settings/unit-conversions" element={<UnitConversions />} />
          <Route path="finance/buyers" element={<BuyersList />} />
          <Route path="finance/buyers/:buyerId" element={<CustomerProfile />} />
          <Route path="operations/buyers" element={<Navigate to="/finance/buyers" replace />} />
          <Route path="operations/buyers/registry" element={<Navigate to="/finance/buyers" replace />} />

          {/* Human Resources */}
          <Route path="hr/staff" element={<StaffRegistry />} />
          <Route path="hr/payroll" element={<Payroll />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}