import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import Layout from './components/Layout';
import AdminLogin from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Proposals from './pages/Proposals';
import Messages from './pages/Messages';
import Ads from './pages/Ads';
import Pages from './pages/Pages';
import SecuritySettings from './pages/SecuritySettings';
import IPManagement from './pages/IPManagement';
import AccessLogs from './pages/AccessLogs';
import OTPLogs from './pages/OTPLogs';
import CallLogs from './pages/CallLogs';
import SystemHealth from './pages/SystemHealth';
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAdminAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
      <div className="spinner" />
    </div>
  );
  return token ? children : <Navigate to="/login" />;
};

const Wrap = ({ children }) => (
  <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>
);

const AdminRoutes = () => {
  const { token } = useAdminAuth();
  return (
    <Routes>
      <Route path="/login"             element={token ? <Navigate to="/dashboard" /> : <AdminLogin />} />
      <Route path="/dashboard"         element={<Wrap><Dashboard /></Wrap>} />
      <Route path="/users"             element={<Wrap><Users /></Wrap>} />
      <Route path="/proposals"         element={<Wrap><Proposals /></Wrap>} />
      <Route path="/messages"          element={<Wrap><Messages /></Wrap>} />
      <Route path="/ads"               element={<Wrap><Ads /></Wrap>} />
      <Route path="/pages"             element={<Wrap><Pages /></Wrap>} />
      {/* Security */}
      <Route path="/security-settings" element={<Wrap><SecuritySettings /></Wrap>} />
      <Route path="/ip-management"     element={<Wrap><IPManagement /></Wrap>} />
      <Route path="/access-logs"       element={<Wrap><AccessLogs /></Wrap>} />
      <Route path="/otp-logs"          element={<Wrap><OTPLogs /></Wrap>} />
      {/* Calls */}
      <Route path="/call-logs"         element={<Wrap><CallLogs /></Wrap>} />
      {/* System */}
      <Route path="/system-health"     element={<Wrap><SystemHealth /></Wrap>} />
      <Route path="*"                  element={<Navigate to={token ? '/dashboard' : '/login'} />} />
    </Routes>
  );
};

export default function App() {
  return (
    <Router>
      <AdminAuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: "'Hind', sans-serif", fontSize: 14 },
            success: { iconTheme: { primary: '#c0392b', secondary: 'white' } },
          }}
        />
        <AdminRoutes />
      </AdminAuthProvider>
    </Router>
  );
}
