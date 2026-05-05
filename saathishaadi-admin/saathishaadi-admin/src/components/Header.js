import React from 'react';
import { useMenuOpen } from './Layout';
import './Header.css';

export default function Header({ title, subtitle }) {
  const openMenu = useMenuOpen();
  return (
    <header className="admin-header">
      <div className="header-left">
        <button className="menu-btn" onClick={openMenu}>☰</button>
        <div>
          <h2 className="header-title">{title}</h2>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="header-right">
        <div className="header-badge">
          <span className="live-dot" />
          Live
        </div>
        <div className="header-time">
          {new Date().toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>
    </header>
  );
}
