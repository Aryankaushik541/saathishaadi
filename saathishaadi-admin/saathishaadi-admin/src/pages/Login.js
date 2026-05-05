import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminAPI } from '../utils/api';
import './Login.css';

export default function AdminLogin() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return toast.error('Sab fields bharo');
    setLoading(true);
    try {
      const data = await adminAPI(null).login(form);
      login(data.token, data.admin);
      toast.success('Admin panel mein swagat hai!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login fail hua');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">💍</div>
          <h1>SaathiShaadi</h1>
          <p>Admin Control Panel</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Admin Username</label>
            <input
              className="input"
              type="text"
              placeholder="admin"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>
          <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? 'Login ho raha hai...' : '🔐 Admin Login'}
          </button>
        </form>

        <div className="login-hint">
          <p>Default: <strong>admin</strong> / <strong>saathishaadi@admin2025</strong></p>
          <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>
            Backend .env se change kar sakte hain
          </p>
        </div>
      </div>
    </div>
  );
}
