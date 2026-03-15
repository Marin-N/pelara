import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Layout from './components/Layout/Layout.jsx';
import LoginPage from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import Calls from './pages/Calls.jsx';
import Competitors from './pages/Competitors.jsx';
import Reports from './pages/Reports.jsx';
import Alerts from './pages/Alerts.jsx';
import Billing from './pages/Billing.jsx';
import Settings from './pages/Settings.jsx';
import CallbackPage from './pages/Callback.jsx';
import Reviews from './pages/Reviews.jsx';
import ActionPlans from './pages/ActionPlans.jsx';
import Onboarding from './pages/Onboarding.jsx';
import LoadingSpinner from './components/Common/LoadingSpinner.jsx';

// Wraps a route — redirects to login if user is not authenticated
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth0();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="calls" element={<Calls />} />
          <Route path="competitors" element={<Competitors />} />
          <Route path="reports" element={<Reports />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="billing" element={<Billing />} />
          <Route path="settings" element={<Settings />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="action-plans" element={<ActionPlans />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
