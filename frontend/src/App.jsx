import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { PlatformAuthProvider } from './features/platform/context/PlatformAuthContext';
import { ProtectedRoute as PlatformProtectedRoute } from './features/platform/components/ProtectedRoute';
import PlatformLogin from './features/platform/pages/Login';
import OrganizationsList from './features/platform/pages/OrganizationsList';
import CreateOrganization from './features/platform/pages/CreateOrganization';
import OrganizationDetail from './features/platform/pages/OrganizationDetail';
import PlatformModules from './features/platform/pages/Modules';

import { OrgAuthProvider } from './features/org/context/OrgAuthContext';
import { ProtectedRoute as OrgProtectedRoute } from './features/org/components/ProtectedRoute';
import { AdminProtectedRoute } from './features/org/components/AdminProtectedRoute';
import OrgLogin from './features/org/pages/Login';
import Teams from './features/org/pages/Teams';
import Roles from './features/org/pages/Roles';
import Users from './features/org/pages/Users';
import Leads from './features/org/pages/Leads';
import LeadDetail from './features/org/pages/LeadDetail';
import Dashboard from './features/org/pages/Dashboard';
import ChangePasswordForced from './features/org/pages/ChangePasswordForced';
import OrgModules from './features/org/pages/Modules';

import Landing from './pages/Landing';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <PlatformAuthProvider>
      <OrgAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />

            {/* Module 1 — Platform Administration */}
            <Route path="/platform/login" element={<PlatformLogin />} />
            <Route
              path="/platform/organizations"
              element={
                <PlatformProtectedRoute>
                  <OrganizationsList />
                </PlatformProtectedRoute>
              }
            />
            <Route
              path="/platform/organizations/new"
              element={
                <PlatformProtectedRoute>
                  <CreateOrganization />
                </PlatformProtectedRoute>
              }
            />
            <Route
              path="/platform/organizations/:id"
              element={
                <PlatformProtectedRoute>
                  <OrganizationDetail />
                </PlatformProtectedRoute>
              }
            />
            <Route
              path="/platform/modules"
              element={
                <PlatformProtectedRoute>
                  <PlatformModules />
                </PlatformProtectedRoute>
              }
            />

            {/* Module 2 — Organization Administration (admin-only) */}
            <Route path="/org/login" element={<OrgLogin />} />
            <Route
              path="/org/change-password"
              element={
                <OrgProtectedRoute>
                  <ChangePasswordForced />
                </OrgProtectedRoute>
              }
            />
            <Route
              path="/org/teams"
              element={
                <AdminProtectedRoute>
                  <Teams />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/org/roles"
              element={
                <AdminProtectedRoute>
                  <Roles />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/org/users"
              element={
                <AdminProtectedRoute>
                  <Users />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/org/modules"
              element={
                <AdminProtectedRoute>
                  <OrgModules />
                </AdminProtectedRoute>
              }
            />

            {/* Module 4 — Dashboard & Analytics (open to any org user; shape scoped server-side) */}
            <Route
              path="/org/dashboard"
              element={
                <OrgProtectedRoute>
                  <Dashboard />
                </OrgProtectedRoute>
              }
            />

            {/* Module 3 — Sales Management (open to any org user; visibility scoped server-side) */}
            <Route
              path="/org/leads"
              element={
                <OrgProtectedRoute>
                  <Leads />
                </OrgProtectedRoute>
              }
            />
            <Route
              path="/org/leads/:id"
              element={
                <OrgProtectedRoute>
                  <LeadDetail />
                </OrgProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </OrgAuthProvider>
    </PlatformAuthProvider>
  );
}
