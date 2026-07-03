import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { canAccessCommandCenter, getDefaultLandingPath, hasRole, isSingleTenantUser } from './lib/roles';

// Import the StaffProvider to fix the useStaff context error
import { StaffProvider } from './providers/StaffProvider';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Route-loaded pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ClaimAccountPage = lazy(() => import('./pages/auth/ClaimAccountPage'));
const SystemAdminDashboardPage = lazy(() => import('./pages/auth/SystemAdminDashboardPage'));
const SuperAdminCooperativeSetupPage = lazy(() => import('./pages/auth/SuperAdminCooperativeSetupPage'));
const CooperativeAdminOnboardingPage = lazy(() => import('./pages/auth/CooperativeAdminOnboardingPage'));
const CustomerPortal = lazy(() => import('./pages/external/CustomerPortal'));
const CommandCenter = lazy(() => import('./pages/CommandCenter'));
const MemberDashboard = lazy(() => import('./pages/MemberDashboard'));
const YieldLog = lazy(() => import('./pages/operations/productionLog'));
const SafetyDashboard = lazy(() => import('./pages/operations/SafetyDashboard'));
const MedicalRecords = lazy(() => import('./pages/operations/MedicalRecords'));

// NEW: Added the Milk Drop Reports lazy import
const MilkDropReports = lazy(() => import('./pages/operations/MilkDropReports'));

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
  return getDefaultLandingPath(user);
};

const RoleRoute = ({ children, allowedRoles }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoadingFallback label="Checking role access…" />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (isSingleTenantUser(currentUser)) {
    return children;
  }

  if (!hasRole(currentUser, allowedRoles)) {
    return <Navigate to={getDefaultRoute(currentUser)} replace />;
  }

  return children;
};

const CommandCenterRoute = ({ children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoadingFallback label="Checking dashboard access…" />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessCommandCenter(currentUser)) {
    return <Navigate to={getDefaultRoute(currentUser)} replace />;
  }

  return children;
};

const RoleLandingRedirect = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoadingFallback label="Preparing workspace…" />;
  }

  return <Navigate to={getDefaultRoute(currentUser)} replace />;
};

const UnknownRouteRedirect = () => {
  const { currentUser } = useAuth();
  return <Navigate to={getDefaultRoute(currentUser)} replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      {/* Wrap all routes with StaffProvider. 
        Now any page, including Payroll and StaffRegistry, can call useStaff() without crashing.
      */}
      <StaffProvider>
        <Routes>
          <Route path="/register" element={renderLazyPage(RegisterPage, 'Loading registration…')} />
          <Route path="/login" element={renderLazyPage(LoginPage, 'Loading login…')} />
          <Route path="/claim-account" element={renderLazyPage(ClaimAccountPage, 'Loading claim account…')} />
          <Route path="/shared/statement/:token" element={renderLazyPage(CustomerPortal, 'Loading statement…')} />
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<RoleLandingRedirect />} />

            {/* Role-based landing areas */}
            <Route
              path="system-admin/dashboard"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                  {renderLazyPage(SystemAdminDashboardPage, 'Loading system admin dashboard…')}
                </RoleRoute>
              )}
            />
            <Route
              path="system-admin/cooperatives"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                  {renderLazyPage(SuperAdminCooperativeSetupPage, 'Loading superadmin setup…')}
                </RoleRoute>
              )}
            />
            <Route path="system-admin" element={<Navigate to="/system-admin/dashboard" replace />} />
            <Route
              path="cooperative-admin/members"
              element={(
                <RoleRoute allowedRoles={['ADMIN']}>
                  {renderLazyPage(CooperativeAdminOnboardingPage, 'Loading member onboarding…')}
                </RoleRoute>
              )}
            />
            <Route path="cooperative-admin" element={<Navigate to="/cooperative-admin/members" replace />} />
            <Route
              path="member/dashboard"
              element={(
                <RoleRoute allowedRoles={['FARMER']}>
                  {renderLazyPage(MemberDashboard, 'Loading member dashboard…')}
                </RoleRoute>
              )}
            />
            
            {/* Main Telemetry */}
            <Route
              path="dashboard"
              element={(
                <CommandCenterRoute>
                  {renderLazyPage(CommandCenter, 'Loading dashboard…')}
                </CommandCenterRoute>
              )}
            />
            
            {/* Production & Biology */}
            <Route path="operations/yield" element={renderLazyPage(YieldLog, 'Loading yield log…')} />
            <Route path="operations/herd" element={renderLazyPage(HerdRegistry, 'Loading herd registry…')} />
            <Route path="operations/breeding" element={renderLazyPage(BreedingHub, 'Loading breeding hub…')} />
            <Route path="operations/clerk" element={renderLazyPage(ClerkEntry, 'Loading clerk entry…')} />
            
            {/* NEW: Added the Milk Drop Reports route */}
            <Route path="operations/milk-drop-reports" element={renderLazyPage(MilkDropReports, 'Loading milk drop reports…')} />

            <Route path="tasks" element={renderLazyPage(HerdsmanView, 'Loading herdsman view…')} />
            <Route path="operations/herdsman" element={renderLazyPage(HerdsmanView, 'Loading herdsman view…')} />
            <Route path="operations/lab" element={renderLazyPage(MilkLab, 'Loading milk lab…')} />
            <Route path="operations/nutrition" element={renderLazyPage(NutritionDashboard, 'Loading nutrition dashboard…')} />
            <Route path="feed-nutrition" element={renderLazyPage(NutritionDashboard, 'Loading nutrition dashboard…')} />
            
            {/* UPDATED: Unit Conversions moved to operations layer to match sidebar UX */}
            <Route
              path="operations/unit-conversions"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  {renderLazyPage(UnitConversions, 'Loading unit conversions…')}
                </RoleRoute>
              )}
            />
            {/* Redirect to catch any legacy links pointing to settings */}
            <Route path="settings/unit-conversions" element={<Navigate to="/operations/unit-conversions" replace />} />

            <Route path="operations/routine" element={renderLazyPage(DailyRoutinePlanner, 'Loading routine planner…')} />
            <Route path="operations/safety" element={renderLazyPage(SafetyDashboard, 'Loading safety dashboard…')} />
            <Route path="operations/records" element={renderLazyPage(MedicalRecords, 'Loading medical records…')} />
            <Route path="operations/animal/:id/milk-history" element={renderLazyPage(MilkHistory, 'Loading milk history…')} />
            <Route path="operations/animal/:id" element={renderLazyPage(AnimalPassport, 'Loading animal record…')} />
            
            {/* Capital & Inventory */}
            <Route
              path="finance/ledger"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  {renderLazyPage(FinancialLedger, 'Loading financial ledger…')}
                </RoleRoute>
              )}
            />
            <Route
              path="operations/inventory"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  {renderLazyPage(InventoryRegistry, 'Loading inventory…')}
                </RoleRoute>
              )}
            />
            <Route
              path="operations/feed-formulation"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  {renderLazyPage(FeedFormulation, 'Loading feed formulation…')}
                </RoleRoute>
              )}
            />
            <Route
              path="feed-nutrition/mix"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  {renderLazyPage(FeedFormulation, 'Loading feed formulation…')}
                </RoleRoute>
              )}
            />
            <Route path="operations/schedule-planner" element={<Navigate to="/operations/routine" replace />} />
            
            <Route
              path="finance/buyers"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  {renderLazyPage(BuyersList, 'Loading buyers…')}
                </RoleRoute>
              )}
            />
            <Route
              path="finance/buyers/:buyerId"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  {renderLazyPage(CustomerProfile, 'Loading customer profile…')}
                </RoleRoute>
              )}
            />
            <Route path="operations/buyers" element={<Navigate to="/finance/buyers" replace />} />
            <Route path="operations/buyers/registry" element={<Navigate to="/finance/buyers" replace />} />

            {/* Human Resources */}
            <Route
              path="hr/staff"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  {renderLazyPage(StaffRegistry, 'Loading staff registry…')}
                </RoleRoute>
              )}
            />
            <Route
              path="hr/payroll"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  {renderLazyPage(Payroll, 'Loading payroll…')}
                </RoleRoute>
              )}
            />

            <Route path="*" element={<UnknownRouteRedirect />} />
          </Route>
        </Routes>
      </StaffProvider>
    </BrowserRouter>
  );
}