import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import toast from 'react-hot-toast';
import './Sidebar.css';

const navItems = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/users', icon: '👥', label: 'Users' },
  { to: '/proposals', icon: '💌', label: 'Proposals' },
  { to: '/messages', icon: '💬', label: 'Messages' },
  { to: '/ads', icon: '📢', label: 'Advertisements' },
  { to: '/pages', icon: '📄', label: 'Pages' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { logout, admin } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logout ho gaye');
    navigate('/login');
  };

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo-icon">💍</span>
          <div>
            <div className="sidebar-brand">SaathiShaadi</div>
            <div className="sidebar-sub">Admin Panel</div>
          </div>
        </div>

        <div className="sidebar-admin-info">
          <div className="sidebar-avatar">👑</div>
          <div>
            <div className="sidebar-admin-name">{admin?.name || 'Admin'}</div>
            <div className="sidebar-admin-role">Super Admin</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
