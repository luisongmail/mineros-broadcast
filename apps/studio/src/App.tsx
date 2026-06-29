import { Navigate, Route, Routes } from 'react-router-dom';

import { OperatorControlPanel } from './components/OperatorControlPanel';
import AdminPanel from './modules/admin/AdminPanel';
import { AdminUsersPage } from './modules/admin/AdminUsersPage';
import { AuditViewerPage } from './modules/admin/AuditViewerPage';
import { PermissionSimulatorPage } from './modules/admin/PermissionSimulatorPage';
import { LoginPage, OtpVerifyPage, ScopeSelectorPage } from './modules/auth/AuthPages';
import { MfaSetupPage } from './modules/auth/MfaSetupPage';
import { MfaVerifyPage } from './modules/auth/MfaVerifyPage';
import { PrivateRoute } from './modules/auth/PrivateRoute';
import { ProtectedRoute } from './modules/auth/ProtectedRoute';
import { BroadcastPage } from './pages/BroadcastPage';
import { LiveGameScoringPage } from './pages/LiveGameScoringPage';
import { OverlayPage } from './pages/OverlayPage';
import { ScorerPage } from './pages/ScorerPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/otp" element={<LoginPage />} />
      <Route path="/auth/verify" element={<OtpVerifyPage />} />
      <Route path="/auth/mfa" element={<MfaVerifyPage />} />
      <Route path="/auth/select-scope" element={<ScopeSelectorPage />} />

      <Route path="/broadcast" element={<BroadcastPage />} />
      <Route path="/overlay/:overlayId" element={<OverlayPage />} />
      <Route
        path="/control"
        element={(
          <PrivateRoute>
            <OperatorControlPanel />
          </PrivateRoute>
        )}
      />
      <Route
        path="/control/admin"
        element={(
          <ProtectedRoute allowedRoles={['SysAdmin']}>
            <AdminPanel />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/scorer"
        element={(
          <PrivateRoute>
            <ScorerPage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/live-game-scoring"
        element={(
          <PrivateRoute>
            <LiveGameScoringPage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/settings/mfa"
        element={(
          <PrivateRoute>
            <MfaSetupPage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/admin/users"
        element={(
          <PrivateRoute>
            <AdminUsersPage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/admin/audit"
        element={(
          <PrivateRoute>
            <AuditViewerPage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/admin/permissions"
        element={(
          <PrivateRoute>
            <PermissionSimulatorPage />
          </PrivateRoute>
        )}
      />
      <Route
        path="/"
        element={(
          <PrivateRoute>
            <OperatorControlPanel />
          </PrivateRoute>
        )}
      />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
