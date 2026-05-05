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

const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAdminAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
      <div className="spinner" />
    </div>
  );
  return token ? children : <Navigate to="/login" />;
};

const AdminRoutes = () => {
  const { token } = useAdminAuth();
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <AdminLogin />} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Layout><Users /></Layout></ProtectedRoute>} />
      <Route path="/proposals" element={<ProtectedRoute><Layout><Proposals /></Layout></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Layout><Messages /></Layout></ProtectedRoute>} />
      <Route path="/ads" element={<ProtectedRoute><Layout><Ads /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
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
