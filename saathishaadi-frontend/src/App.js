import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Browse from './pages/Browse';
import Profile from './pages/Profile';
import Proposals from './pages/Proposals';
import Chat from './pages/Chat';
import VideoCall from './pages/VideoCall';
import ContentPage from './pages/ContentPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader" />;
  return user ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={user ? <Navigate to="/browse" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/browse" /> : <Register />} />
        <Route path="/browse" element={<ProtectedRoute><Browse /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/proposals" element={<ProtectedRoute><Proposals /></ProtectedRoute>} />
        <Route path="/chats" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/chat/:userId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/call/:userId" element={<ProtectedRoute><VideoCall /></ProtectedRoute>} />
        <Route path="/pages/:slug" element={<ContentPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          style: { fontFamily: "'Hind', sans-serif", fontSize: 14 },
          success: { iconTheme: { primary: '#c0392b', secondary: 'white' } },
        }} />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
