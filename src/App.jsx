import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { canAccessCommandCenter, getDefaultLandingPath, hasRole, isSingleTenantUser } from './lib/roles';
import { AUTH_STATES, getAuthState, getGateRoute } from './lib/authState';
import { getPageKeyForPath } from './lib/pageRoutes';

// Import the StaffProvider to fix the useStaff context error
import { StaffProvider } from './providers/StaffProvider';
import PageSkeleton from './components/ui/PageSkeleton';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Route-loaded pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage.jsx'));
const ClaimAccountPage = lazy(() => import('./pages/auth/ClaimAccountPage.jsx'));
const RequiredPasswordResetPage = lazy(() => import('./pages/auth/RequiredPasswordResetPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage.jsx'));
const VerifyPhonePage = lazy(() => import('./pages/auth/VerifyPhonePage.jsx'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage.jsx'));
const GoogleCompletePage = lazy(() => import('./pages/auth/GoogleCompletePage.jsx'));
const SystemAdminDashboardPage = lazy(() => import('./pages/auth/SystemAdminDashboardPage.jsx'));
const SuperAdminCooperativeSetupPage = lazy(() => import('./pages/auth/SuperAdminCooperativeSetupPage.jsx'));
const CooperativeAdminOnboardingPage = lazy(() => import('./pages/auth/CooperativeAdminOnboardingPage.jsx'));
const CustomerPortal = lazy(() => import('./pages/external/CustomerPortal.jsx'));
const CommandCenter = lazy(() => import('./pages/CommandCenter.jsx'));
const MemberDashboard = lazy(() => import('./pages/MemberDashboard.jsx'));
const YieldLog = lazy(() => import('./pages/operations/productionLog.jsx'));
const SafetyDashboard = lazy(() => import('./pages/operations/SafetyDashboard.jsx'));
const MedicalRecords = lazy(() => import('./pages/operations/MedicalRecords.jsx'));

// NEW: Added the Milk Drop Reports lazy import
const MilkDropReports = lazy(() => import('./pages/operations/MilkDropReports.jsx'));

const ClerkEntry = lazy(() => import('./pages/operations/ClerkEntry.jsx'));
const HerdsmanView = lazy(() => import('./pages/operations/HerdsmanView.jsx'));
const HerdRegistry = lazy(() => import('./pages/operations/HerdRegistry.jsx'));
const MilkLab = lazy(() => import('./pages/operations/MilkLab.jsx'));
const BreedingHub = lazy(() => import('./pages/operations/BreedingHub.jsx'));
const AnimalPassport = lazy(() => import('./pages/operations/AnimalRecord.jsx'));
const MilkHistory = lazy(() => import('./pages/operations/MilkHistory.jsx'));
const FeedFormulation = lazy(() => import('./pages/inventory/FeedFormulation.jsx'));
const MilkInventoryReport = lazy(() => import('./pages/operations/MilkInventoryReport.jsx'));
const OperationsReportsPage = lazy(() => import('./pages/operations/OperationsReportsPage.jsx'));
const MilkUsage = lazy(() => import('./pages/operations/MilkUsage.jsx'));
const DairyUnitEconomicsReport = lazy(() => import('./pages/finance/DairyUnitEconomicsReport.jsx'));
const AnimalEconomicsReport = lazy(() => import('./pages/finance/AnimalEconomicsReport.jsx'));
const CustomersPage = lazy(() => import('./pages/operations/Customers.jsx'));
const NutritionDashboard = lazy(() => import('./pages/nutrition/NutritionDashboard.jsx'));
const TodayFeedingPage = lazy(() => import('./pages/nutrition/TodayFeedingPage.jsx'));
// UPDATED: Pointing to the new correct location in the nutrition folder
const UnitConversions = lazy(() => import('./pages/nutrition/UnitConversions.jsx'));
const DailyRoutinePlanner = lazy(() => import('./pages/operations/DailyRoutinePlanner.jsx'));
const FinancialLedger = lazy(() => import('./pages/finance/FinancialLedger.jsx'));
const InventoryRegistry = lazy(() => import('./pages/inventory/InventoryRegistry.jsx'));
const BuyersList = lazy(() => import('./pages/finance/BuyersList.jsx'));
const CustomerProfile = lazy(() => import('./pages/finance/CustomerProfile.jsx'));
const StaffRegistry = lazy(() => import('./pages/hr/StaffRegistry.jsx'));
const Payroll = lazy(() => import('./pages/hr/Payroll.jsx'));

/**
 * PROTECTED ROUTE GATEKEEPER
 * Ensures the 'X-Tenant-ID' context is valid before mounting.
 */
export const ProtectedRoute = ({ children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) return <PublicRouteFallback label="Verifying access…" />;

  if (!currentUser) return <Navigate to="/login" replace />;
  const gateRoute = getGateRoute(currentUser);
  if (gateRoute) return <Navigate to={gateRoute} replace />;

  return children;
};

// Inside the app shell: a page-shaped skeleton in the content area.
const RouteLoadingFallback = ({ label = 'Loading page…' }) => <PageSkeleton label={label} />;
// Outside the shell (sign-in, verification, shared statements): a full-screen form card.
function PublicRouteFallback({ label = 'Loading…' }) {
  return <PageSkeleton variant="card" label={label} />;
}

const renderLazyPage = (Page, label) => (
  <Suspense fallback={<RouteLoadingFallback label={label} />}>
    <Page />
  </Suspense>
);

const renderPublicPage = (Page, label) => (
  <Suspense fallback={<PublicRouteFallback label={label} />}>
    <Page />
  </Suspense>
);

const getDefaultRoute = (user) => {
  return getDefaultLandingPath(user);
};

export const RequiredPasswordResetRoute = ({ children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) return <PublicRouteFallback label="Checking password status…" />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (getAuthState(currentUser) !== AUTH_STATES.PASSWORD_RESET_REQUIRED) return <Navigate to={getDefaultRoute(currentUser)} replace />;

  return children;
};

// Open to any signed-in user: the Google sign-in gate sends people here, and the
// dashboard banner lets everyone else add or verify a phone. A required password
// reset still comes first.
export const PhoneVerificationRoute = ({ children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) return <PublicRouteFallback label="Checking your account…" />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (getAuthState(currentUser) === AUTH_STATES.PASSWORD_RESET_REQUIRED) return <Navigate to="/reset-required-password" replace />;

  return children;
};

const RoleRoute = ({ children, allowedRoles }) => {
  const { currentUser, isLoading } = useAuth();
  const { pathname } = useLocation();

  if (isLoading) {
    return <RouteLoadingFallback label="Checking role access…" />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Staff with explicit page access: DashboardLayout's page gate decides these routes.
  // Member onboarding also needs an admin role, so it stays with the role check below.
  const pageKey = getPageKeyForPath(pathname);
  if (Array.isArray(currentUser.page_access) && pageKey && pageKey !== 'member_admin') {
    return children;
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

export const RoleLandingRedirect = () => {
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
          <Route path="/register" element={renderPublicPage(RegisterPage, 'Loading registration…')} />
          <Route path="/login" element={renderPublicPage(LoginPage, 'Loading login…')} />
          <Route path="/claim-account" element={renderPublicPage(ClaimAccountPage, 'Loading claim account…')} />
          <Route path="/forgot-password" element={renderPublicPage(ForgotPasswordPage, 'Loading password reset…')} />
          <Route path="/reset-password" element={renderPublicPage(ResetPasswordPage, 'Loading password reset…')} />
          <Route path="/verify-email" element={renderPublicPage(VerifyEmailPage, 'Loading email verification…')} />
          <Route path="/auth/google/complete" element={renderPublicPage(GoogleCompletePage, 'Signing you in…')} />
          <Route
            path="/verify-phone"
            element={(
              <PhoneVerificationRoute>
                {renderPublicPage(VerifyPhonePage, 'Loading phone verification…')}
              </PhoneVerificationRoute>
            )}
          />
          <Route
            path="/reset-required-password"
            element={(
              <RequiredPasswordResetRoute>
                {renderPublicPage(RequiredPasswordResetPage, 'Loading password setup…')}
              </RequiredPasswordResetRoute>
            )}
          />
          <Route path="/shared/statement/:token" element={renderPublicPage(CustomerPortal, 'Loading statement…')} />
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<RoleLandingRedirect />} />
            {/* Public "/" is the static landing page (index.html); /app is the SPA's entry point. */}
            <Route path="app" element={<RoleLandingRedirect />} />

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
                <RoleRoute allowedRoles={['ADMIN', 'FARM_ADMIN']}>
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
            <Route path="operations/milk-usage" element={renderLazyPage(MilkUsage, 'Loading milk usage…')} />
            <Route path="operations/herd" element={renderLazyPage(HerdRegistry, 'Loading herd registry…')} />
            <Route path="operations/breeding" element={renderLazyPage(BreedingHub, 'Loading breeding hub…')} />
            <Route path="operations/clerk" element={renderLazyPage(ClerkEntry, 'Loading clerk entry…')} />

            {/* NEW: Added the Milk Drop Reports route */}
            <Route path="operations/milk-drop-reports" element={renderLazyPage(MilkDropReports, 'Loading milk drop reports…')} />

            <Route path="tasks" element={renderLazyPage(HerdsmanView, 'Loading herdsman view…')} />
            <Route path="operations/herdsman" element={renderLazyPage(HerdsmanView, 'Loading herdsman view…')} />
            <Route path="operations/lab" element={renderLazyPage(MilkLab, 'Loading milk feeding planner…')} />
            <Route path="operations/nutrition" element={renderLazyPage(NutritionDashboard, 'Loading feed planner…')} />
            <Route path="feed-nutrition" element={renderLazyPage(NutritionDashboard, 'Loading feed planner…')} />
            {/* Page access `feeding` (or `feed`); DashboardLayout's page gate enforces it. */}
            <Route path="feeding" element={renderLazyPage(TodayFeedingPage, 'Loading today’s feeding…')} />

            {/* UPDATED: Unit Helpers moved to operations layer to match sidebar UX */}
            <Route
              path="operations/unit-conversions"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  {renderLazyPage(UnitConversions, 'Loading unit helpers…')}
                </RoleRoute>
              )}
            />
            {/* Redirect to catch any legacy links pointing to settings */}
            <Route path="settings/unit-conversions" element={<Navigate to="/operations/unit-conversions" replace />} />

            <Route path="operations/routine" element={renderLazyPage(DailyRoutinePlanner, 'Loading routine planner…')} />
            <Route
              path="operations/safety"
              element={(
                <RoleRoute allowedRoles={['ADMIN', 'FARM_MANAGER', 'FARMER']}>
                  {renderLazyPage(SafetyDashboard, 'Loading safety dashboard…')}
                </RoleRoute>
              )}
            />
            <Route path="operations/records" element={renderLazyPage(MedicalRecords, 'Loading medical records…')} />
            <Route path="operations/animal/:id/milk-history" element={renderLazyPage(MilkHistory, 'Loading milk history…')} />
            <Route path="operations/animal/:id" element={renderLazyPage(AnimalPassport, 'Loading animal record…')} />

            {/* Reports */}
            <Route
              path="operations/reports"
              element={
                <RoleRoute allowedRoles={['ADMIN', 'FARM_MANAGER', 'FARMER']}>{renderLazyPage(OperationsReportsPage, 'Loading reporting dashboard…')}</RoleRoute>
              }
            />
            <Route
              path="operations/reports/milk-inventory"
              element={
                <RoleRoute allowedRoles={['ADMIN', 'FARM_MANAGER', 'FARMER']}>{renderLazyPage(MilkInventoryReport, 'Loading milk inventory report…')}</RoleRoute>
              }
            />
            <Route
              path="finance/reports/dairy-unit-economics"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'FARM_MANAGER']}>{renderLazyPage(DairyUnitEconomicsReport, 'Loading dairy unit economics report…')}</RoleRoute>
              }
            />
            <Route
              path="finance/reports/animal-economics"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'FARM_MANAGER']}>{renderLazyPage(AnimalEconomicsReport, 'Loading cow profitability...')}</RoleRoute>
              }
            />

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
                  {renderLazyPage(FeedFormulation, 'Loading feed mixing planner…')}
                </RoleRoute>
              )}
            />
            <Route
              path="feed-nutrition/mix"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  {renderLazyPage(FeedFormulation, 'Loading feed mixing planner…')}
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
              path="finance/customers/:customerId"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  {renderLazyPage(CustomerProfile, 'Loading customer profile…')}
                </RoleRoute>
              )}
            />
            <Route path="operations/buyers" element={<Navigate to="/finance/buyers" replace />} />
            <Route path="operations/buyers/registry" element={<Navigate to="/finance/buyers" replace />} />
            <Route
              path="operations/customers"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'FARMER']}>
                  {renderLazyPage(CustomersPage, 'Loading customer management...')}
                </RoleRoute>
              )}
            />

            {/* Human Resources */}
            <Route
              path="hr/staff"
              element={(
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'FARM_ADMIN', 'FARMER']}>
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
