import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './AuthPage.css';

const LoginPage = () => {
  const [step, setStep] = useState(1); // 1 = phone, 2 = OTP
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendOTP, login } = useAuth();
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (phone.length !== 10) return toast.error('10 digit phone number daalein');
    setLoading(true);
    try {
      await sendOTP(phone);
      toast.success('OTP bheja gaya! (Dev mode: 123456)');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP bhejne mein error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('6 digit OTP daalein');
    setLoading(true);
    try {
      const res = await login(phone, otp);
      toast.success('Login safal! Swagat hai 🪷');
      navigate(res.user?.isProfileComplete ? '/browse' : '/profile/edit');
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP galat hai');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <h1>🪷 SaathiShaadi</h1>
          <p>Bihar Ka No.1 Vivah Portal</p>
        </div>
        <div className="auth-illustration">
          <div className="auth-quotes">
            <blockquote>"Saat Janmon Ka Bandhan"</blockquote>
            <p>Bihar ke 50,000+ profiles mein apna saathi dhundhe</p>
          </div>
          <div className="auth-floating-cards">
            {['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur'].map((city, i) => (
              <div key={city} className={`auth-city-chip city-${i}`}>📍 {city}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-box">
          <div className="auth-header">
            <h2>Login Karein</h2>
            <p>Apne account mein pravesh karein</p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendOTP}>
              <div className="form-group">
                <label>📱 Mobile Number</label>
                <div className="phone-input-wrap">
                  <span className="phone-prefix">+91</span>
                  <input
                    type="tel"
                    className="input-field phone-input"
                    placeholder="10 digit mobile number"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                    required
                    maxLength={10}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
                {loading ? '⏳ Bhej rahe hain...' : '📨 OTP Bhejein'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="otp-info-box">
                <p>OTP bheja gaya: <strong>+91 {phone}</strong></p>
                <button type="button" className="change-phone-btn" onClick={() => setStep(1)}>
                  Change Number
                </button>
              </div>
              <div className="form-group">
                <label>🔐 OTP Code</label>
                <input
                  type="text"
                  className="input-field otp-input"
                  placeholder="6 digit OTP"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                  required
                  maxLength={6}
                />
                <span className="dev-hint">Dev mode mein: 123456 use karein</span>
              </div>
              <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
                {loading ? '⏳ Verify ho raha hai...' : '✅ OTP Verify Karein'}
              </button>
            </form>
          )}

          <div className="auth-divider">
            <span>Nayi Profile?</span>
          </div>
          <Link to="/register" className="auth-switch-btn">
            🌸 Free Register Karein
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
