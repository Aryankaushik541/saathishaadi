import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import logo from '../assest/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { sendOtp, login } = useAuth();
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error('Valid email address daalen');
    }
    setLoading(true);
    try {
      const res = await sendOtp(email);
      setOtpSent(true);
      toast.success('OTP aapke email par bheja gaya! ✉️');
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP send karne mein error');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('6 digit OTP daalen');
    setLoading(true);
    try {
      await login(email, otp);
      toast.success('Login successful! Welcome back 🎉');
      navigate('/browse');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <img src={logo} alt="SaathiShaadi" style={styles.logo} />
          <h1 style={styles.title}>SaathiShaadi</h1>
          <p style={styles.subtitle}>Bihar ka Apna Vivah Portal</p>
        </div>

        <h2 style={styles.formTitle}>{otpSent ? 'OTP Verify करें' : 'Login करें'}</h2>
        <p style={styles.formSub}>
          {otpSent
            ? `OTP bheja gaya: ${email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`
            : 'Apna registered email address daalen'}
        </p>

        {!otpSent ? (
          <form onSubmit={handleSendOtp}>
            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                placeholder="aapka@email.com"
                value={email}
                onChange={e => setEmail(e.target.value.trim())}
                style={styles.input}
                required
                autoComplete="email"
              />
            </div>
            <button type="submit" style={styles.btn} disabled={loading}>
              {loading ? 'Bhej rahe hain...' : 'OTP Bhejें ✉️'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div style={styles.field}>
              <label style={styles.label}>OTP (6 digit)</label>
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ ...styles.input, letterSpacing: 8, textAlign: 'center', fontSize: 22 }}
                required
                autoComplete="one-time-code"
              />
              <p style={styles.hint}>✉️ Email check karein — OTP 10 minutes mein expire hoga</p>
            </div>
            <button type="submit" style={styles.btn} disabled={loading}>
              {loading ? 'Verify ho raha hai...' : 'Verify & Login'}
            </button>
            <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} style={styles.backBtn}>
              ← Email Badlein
            </button>
          </form>
        )}

        <div style={styles.divider}><span>ya</span></div>
        <p style={styles.registerText}>
          Naya account nahi hai?{' '}
          <Link to="/register" style={styles.registerLink}>Register karein — Free</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh', background: 'linear-gradient(135deg, #1a0a0a, #2d1010)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card: {
    background: 'white', borderRadius: 20, padding: '40px 36px',
    maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  header: { textAlign: 'center', marginBottom: 28 },
  logo: { width: 72, height: 72, objectFit: 'contain', margin: '0 auto 8px', display: 'block' },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 26, color: '#1a0a0a' },
  subtitle: { fontSize: 13, color: '#7a5c52', fontFamily: "'Hind', sans-serif" },
  formTitle: { fontFamily: "'Playfair Display', serif", fontSize: 22, color: '#1a0a0a', marginBottom: 6 },
  formSub: { fontSize: 14, color: '#7a5c52', fontFamily: "'Hind', sans-serif", marginBottom: 24 },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#2c1810', marginBottom: 6, fontFamily: "'Hind', sans-serif" },
  input: {
    width: '100%', border: '2px solid #e8d5c4', padding: '12px 16px',
    borderRadius: 8, fontFamily: "'Hind', sans-serif", fontSize: 15,
    color: '#2c1810', outline: 'none', boxSizing: 'border-box',
  },
  hint: { fontSize: 12, color: '#c0392b', marginTop: 6, fontFamily: "'Hind', sans-serif" },
  btn: {
    width: '100%', padding: '14px', background: 'linear-gradient(135deg, #c0392b, #96281b)',
    color: 'white', border: 'none', borderRadius: 10, fontFamily: "'Hind', sans-serif",
    fontWeight: 700, fontSize: 16, cursor: 'pointer', marginBottom: 10,
    boxShadow: '0 4px 14px rgba(192,57,43,0.4)',
  },
  backBtn: {
    width: '100%', padding: '12px', background: 'transparent',
    border: '2px solid #e8d5c4', color: '#7a5c52', borderRadius: 10,
    fontFamily: "'Hind', sans-serif", fontSize: 14, cursor: 'pointer',
  },
  divider: {
    textAlign: 'center', margin: '20px 0', position: 'relative',
    borderTop: '1px solid #e8d5c4', lineHeight: 0,
  },
  registerText: { textAlign: 'center', fontSize: 14, color: '#7a5c52', fontFamily: "'Hind', sans-serif" },
  registerLink: { color: '#c0392b', fontWeight: 600, textDecoration: 'none' },
};

export default Login;
