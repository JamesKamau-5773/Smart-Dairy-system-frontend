import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { canAccessHerdsmanView } from './lib/permissions';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Route-loaded pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const CustomerPortal = lazy(() => import('./pages/external/CustomerPortal'));
const CommandCenter = lazy(() => import('./pages/CommandCenter'));
const YieldLog = lazy(() => import('./pages/operations/productionLog'));
const SafetyDashboard = lazy(() => import('./pages/operations/SafetyDashboard'));
const MedicalRecords = lazy(() => import('./pages/operations/MedicalRecords'));
const ClerkEntry = lazy(() => import('./pages/operations/ClerkEntry'));
const HerdsmanView = lazy(() => import('./pages/operations/HerdsmanView'));
const HerdRegistry = lazy(() => import('./pages/operations/HerdRegistry'));
const MilkLab = lazy(() => import('./pages/operations/MilkLab'));
const BreedingHub = lazy(() => import('./pages/operations/BreedingHub'));
const AnimalPassport = lazy(() => import('./pages/operations/AnimalRecord'));
const MilkHistory = lazy(() => import('./pages/operations/MilkHistory'));
const FeedFormulation = lazy(() => import('./pages/inventory/FeedFormulation'));
const NutritionDashboard = lazy(() => import('./pages/nutrition/NutritionDashboard'));
// UPDATED: Pointing to the new correct location in the nutrition folder
const UnitConversions = lazy(() => import('./pages/nutrition/UnitConversions'));
const DailyRoutinePlanner = lazy(() => import('./pages/operations/DailyRoutinePlanner'));
const FinancialLedger = lazy(() => import('./pages/finance/FinancialLedger'));
const InventoryRegistry = lazy(() => import('./pages/inventory/InventoryRegistry'));
const BuyersList = lazy(() => import('./pages/finance/BuyersList'));
const CustomerProfile = lazy(() => import('./pages/finance/CustomerProfile'));
const StaffRegistry = lazy(() => import('./pages/hr/StaffRegistry'));
const Payroll = lazy(() => import('./pages/hr/Payroll'));

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

const renderLazyPage = (Page, label) => (
  <Suspense fallback={<RouteLoadingFallback label={label} />}>
    <Page />
  </Suspense>
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
        <Route path="/register" element={renderLazyPage(RegisterPage, 'Loading registration…')} />
        <Route path="/login" element={renderLazyPage(LoginPage, 'Loading login…')} />
        <Route path="/shared/statement/:token" element={renderLazyPage(CustomerPortal, 'Loading statement…')} />
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<RoleLandingRedirect />} />
          
          {/* Main Telemetry */}
          <Route path="dashboard" element={renderLazyPage(CommandCenter, 'Loading dashboard…')} />
          
          {/* Production & Biology */}
          <Route path="operations/yield" element={renderLazyPage(YieldLog, 'Loading yield log…')} />
          <Route path="operations/herd" element={renderLazyPage(HerdRegistry, 'Loading herd registry…')} />
          <Route path="operations/breeding" element={renderLazyPage(BreedingHub, 'Loading breeding hub…')} />
          <Route path="operations/clerk" element={renderLazyPage(ClerkEntry, 'Loading clerk entry…')} />
          <Route path="tasks" element={<HerdsmanOnlyRoute>{renderLazyPage(HerdsmanView, 'Loading herdsman view…')}</HerdsmanOnlyRoute>} />
          <Route path="operations/herdsman" element={<HerdsmanOnlyRoute>{renderLazyPage(HerdsmanView, 'Loading herdsman view…')}</HerdsmanOnlyRoute>} />
          <Route path="operations/lab" element={renderLazyPage(MilkLab, 'Loading milk lab…')} />
          <Route path="operations/nutrition" element={renderLazyPage(NutritionDashboard, 'Loading nutrition dashboard…')} />
          <Route path="feed-nutrition" element={renderLazyPage(NutritionDashboard, 'Loading nutrition dashboard…')} />
          
          {/* UPDATED: Unit Conversions moved to operations layer to match sidebar UX */}
          <Route path="operations/unit-conversions" element={renderLazyPage(UnitConversions, 'Loading unit conversions…')} />
          {/* Redirect to catch any legacy links pointing to settings */}
          <Route path="settings/unit-conversions" element={<Navigate to="/operations/unit-conversions" replace />} />

          <Route path="operations/routine" element={renderLazyPage(DailyRoutinePlanner, 'Loading routine planner…')} />
          <Route path="operations/safety" element={renderLazyPage(SafetyDashboard, 'Loading safety dashboard…')} />
          <Route path="operations/records" element={renderLazyPage(MedicalRecords, 'Loading medical records…')} />
          <Route path="operations/animal/:id/milk-history" element={renderLazyPage(MilkHistory, 'Loading milk history…')} />
          <Route path="operations/animal/:id" element={renderLazyPage(AnimalPassport, 'Loading animal record…')} />
          
          {/* Capital & Inventory */}
          <Route path="finance/ledger" element={renderLazyPage(FinancialLedger, 'Loading financial ledger…')} />
          <Route path="operations/inventory" element={renderLazyPage(InventoryRegistry, 'Loading inventory…')} />
          <Route path="operations/feed-formulation" element={renderLazyPage(FeedFormulation, 'Loading feed formulation…')} />
          <Route path="feed-nutrition/mix" element={renderLazyPage(FeedFormulation, 'Loading feed formulation…')} />
          <Route path="operations/schedule-planner" element={<Navigate to="/operations/routine" replace />} />
          
          <Route path="finance/buyers" element={renderLazyPage(BuyersList, 'Loading buyers…')} />
          <Route path="finance/buyers/:buyerId" element={renderLazyPage(CustomerProfile, 'Loading customer profile…')} />
          <Route path="operations/buyers" element={<Navigate to="/finance/buyers" replace />} />
          <Route path="operations/buyers/registry" element={<Navigate to="/finance/buyers" replace />} />

          {/* Human Resources */}
          <Route path="hr/staff" element={renderLazyPage(StaffRegistry, 'Loading staff registry…')} />
          <Route path="hr/payroll" element={renderLazyPage(Payroll, 'Loading payroll…')} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}