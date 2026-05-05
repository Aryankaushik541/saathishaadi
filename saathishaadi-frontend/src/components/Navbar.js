import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assest/logo.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <Link to="/" style={styles.logo}>
          <img src={logo} alt="SaathiShaadi" style={styles.logoIcon} />
          <span style={styles.logoText}>SaathiShaadi</span>
          <span style={styles.logoSub}>Bihar ka Apna Vivah Portal</span>
        </Link>

        <div style={styles.links}>
          <Link to="/" style={styles.link}>Home</Link>
          {user ? (
            <>
              <Link to="/browse" style={styles.link}>Search</Link>
              <Link to="/proposals" style={styles.link}>Proposals</Link>
              <Link to="/chats" style={styles.link}>Messages</Link>
              <Link to="/profile" style={styles.link}>My Profile</Link>
              <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.link}>Login</Link>
              <Link to="/register" style={styles.registerBtn}>Register Free</Link>
            </>
          )}
        </div>

        <button style={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      </div>

      {menuOpen && (
        <div style={styles.mobileMenu}>
          <Link to="/" style={styles.mobileLink} onClick={() => setMenuOpen(false)}>Home</Link>
          {user ? (
            <>
              <Link to="/browse" style={styles.mobileLink} onClick={() => setMenuOpen(false)}>Search</Link>
              <Link to="/proposals" style={styles.mobileLink} onClick={() => setMenuOpen(false)}>Proposals</Link>
              <Link to="/chats" style={styles.mobileLink} onClick={() => setMenuOpen(false)}>Messages</Link>
              <Link to="/profile" style={styles.mobileLink} onClick={() => setMenuOpen(false)}>My Profile</Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} style={styles.mobileLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.mobileLink} onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" style={styles.mobileLink} onClick={() => setMenuOpen(false)}>Register Free</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

const styles = {
  nav: {
    background: 'linear-gradient(135deg, #1a0a0a 0%, #2d1010 100%)',
    borderBottom: '3px solid #d4a017',
    position: 'sticky', top: 0, zIndex: 1000,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  inner: {
    maxWidth: 1200, margin: '0 auto', padding: '12px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  logo: {
    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10,
  },
  logoIcon: { width: 36, height: 36, objectFit: 'contain', display: 'block' },
  logoText: {
    fontFamily: "'Playfair Display', serif", fontSize: 22,
    fontWeight: 700, color: '#d4a017',
  },
  logoSub: {
    fontSize: 11, color: '#c8a882', fontFamily: "'Hind', sans-serif",
    display: 'none', // hidden on small screens via media queries not available inline
  },
  links: { display: 'flex', alignItems: 'center', gap: 8 },
  link: {
    color: '#e8d5c4', textDecoration: 'none', padding: '6px 12px',
    borderRadius: 6, fontFamily: "'Hind', sans-serif", fontSize: 14, fontWeight: 500,
    transition: 'all 0.2s',
  },
  registerBtn: {
    background: 'linear-gradient(135deg, #c0392b, #96281b)',
    color: 'white', textDecoration: 'none', padding: '8px 18px',
    borderRadius: 8, fontFamily: "'Hind', sans-serif", fontSize: 14, fontWeight: 600,
    boxShadow: '0 3px 10px rgba(192,57,43,0.4)',
  },
  logoutBtn: {
    background: 'transparent', color: '#e8d5c4', border: '1px solid #7a5c52',
    padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
    fontFamily: "'Hind', sans-serif", fontSize: 14,
  },
  hamburger: {
    display: 'none', background: 'transparent', border: 'none',
    color: '#d4a017', fontSize: 24, cursor: 'pointer',
  },
  mobileMenu: {
    background: '#2d1010', padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: 8,
    borderTop: '1px solid #3d1a1a',
  },
  mobileLink: {
    color: '#e8d5c4', textDecoration: 'none', padding: '10px 0',
    fontFamily: "'Hind', sans-serif", fontSize: 16,
    borderBottom: '1px solid #3d1a1a',
  },
  mobileLogout: {
    background: 'transparent', color: '#e74c3c', border: 'none',
    padding: '10px 0', textAlign: 'left', cursor: 'pointer',
    fontFamily: "'Hind', sans-serif", fontSize: 16,
  },
};

export default Navbar;
