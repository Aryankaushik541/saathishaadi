import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { BIHAR_DISTRICTS, RELIGIONS, HINDU_CASTES, MUSLIM_CASTES, PROFESSIONS, EDUCATION_LIST } from '../utils/dummyData';
import './AuthPage.css';

const STEPS = ['Phone Verify', 'Basic Info', 'Profile Details', 'Photo Upload'];

const RegisterPage = () => {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '', age: '', gender: '', religion: '', caste: '',
    location: '', profession: '', education: '', bio: '', photo: null
  });
  const { sendOTP, verifyOTP, register } = useAuth();
  const navigate = useNavigate();

  const casteOptions = formData.religion === 'Muslim' ? MUSLIM_CASTES : HINDU_CASTES;

  const handleSendOTP = async () => {
    if (phone.length !== 10) return toast.error('10 digit phone number daalein');
    setLoading(true);
    try {
      await sendOTP(phone);
      toast.success('OTP bheja gaya! (Dev: 123456)');
      setOtpSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (otp.length !== 6) return toast.error('6 digit OTP daalein');
    setLoading(true);
    try {
      await verifyOTP(phone, otp);
      toast.success('Phone verify ho gaya! ✅');
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP galat hai');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(p => ({...p, [e.target.name]: e.target.value}));
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(p => ({...p, photo: file}));
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });
      fd.append('phone', phone);
      await register(fd);
      toast.success('Profile ban gayi! Swagat hai 🪷');
      navigate('/browse');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration error');
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
            <blockquote>"Nayi Shuruaat, Naya Saathi"</blockquote>
            <p>Free registration karein aur apna perfect match dhundhe</p>
          </div>
          <div className="reg-benefits">
            {['✅ Free Registration', '✅ OTP Verified', '✅ Bihar Special', '✅ Privacy Protected', '✅ Direct Chat', '✅ Video Call'].map((b, i) => (
              <div key={i} className="reg-benefit">{b}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-box reg-form-box">
          {/* Step Indicator */}
          <div className="step-indicator">
            {STEPS.map((s, i) => (
              <div key={i} className={`step-dot ${i <= step ? 'active' : ''}`}>
                <div className="step-dot-circle">{i < step ? '✓' : i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {/* Step 0: Phone */}
          {step === 0 && (
            <div className="reg-step">
              <div className="auth-header">
                <h2>📱 Phone Verify Karein</h2>
                <p>Apna Bihar ka mobile number daalein</p>
              </div>
              <div className="form-group">
                <label>Mobile Number</label>
                <div className="phone-input-wrap">
                  <span className="phone-prefix">+91</span>
                  <input
                    type="tel"
                    className="input-field phone-input"
                    placeholder="10 digit number"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                    maxLength={10}
                  />
                </div>
                {!otpSent ? (
                  <button className="btn-primary auth-submit-btn" onClick={handleSendOTP} disabled={loading}>
                    {loading ? '⏳...' : '📨 OTP Bhejein'}
                  </button>
                ) : (
                  <>
                    <div className="form-group" style={{marginTop:16}}>
                      <label>OTP Code</label>
                      <input
                        type="text"
                        className="input-field otp-input"
                        placeholder="6 digit OTP"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                        maxLength={6}
                      />
                      <span className="dev-hint">Dev mode: 123456</span>
                    </div>
                    <button className="btn-primary auth-submit-btn" onClick={handleVerifyPhone} disabled={loading}>
                      {loading ? '⏳...' : '✅ Verify Karein'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="reg-step">
              <div className="auth-header">
                <h2>👤 Basic Jaankari</h2>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Aapka Pura Naam *</label>
                  <input name="name" value={formData.name} onChange={handleChange} className="input-field" placeholder="Full name" required />
                </div>
                <div className="form-group">
                  <label>Aayu (Umar) *</label>
                  <input name="age" type="number" min="18" max="60" value={formData.age} onChange={handleChange} className="input-field" placeholder="Umar" required />
                </div>
              </div>
              <div className="form-group">
                <label>Aap Kaun Hain? *</label>
                <div className="gender-select">
                  {['Male', 'Female'].map(g => (
                    <button key={g} type="button"
                      className={`gender-btn ${formData.gender === g ? 'selected' : ''}`}
                      onClick={() => setFormData(p => ({...p, gender: g}))}
                    >
                      {g === 'Male' ? '👨 Ladka (Var)' : '👩 Ladki (Vadhu)'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Dharm (Religion) *</label>
                  <select name="religion" value={formData.religion} onChange={handleChange} className="input-field">
                    <option value="">Chunein</option>
                    {RELIGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Jati (Caste)</label>
                  <select name="caste" value={formData.caste} onChange={handleChange} className="input-field">
                    <option value="">Chunein (Optional)</option>
                    {casteOptions.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button className="btn-primary auth-submit-btn"
                onClick={() => {
                  if (!formData.name || !formData.age || !formData.gender || !formData.religion)
                    return toast.error('Zaroori jaankari bharein');
                  setStep(2);
                }}>
                Aage →
              </button>
            </div>
          )}

          {/* Step 2: Profile Details */}
          {step === 2 && (
            <div className="reg-step">
              <div className="auth-header">
                <h2>📝 Profile Details</h2>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Sheher/Jila *</label>
                  <select name="location" value={formData.location} onChange={handleChange} className="input-field">
                    <option value="">District Chunein</option>
                    {BIHAR_DISTRICTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Peshaa (Profession)</label>
                  <select name="profession" value={formData.profession} onChange={handleChange} className="input-field">
                    <option value="">Chunein</option>
                    {PROFESSIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Shiksha (Education)</label>
                <select name="education" value={formData.education} onChange={handleChange} className="input-field">
                  <option value="">Chunein</option>
                  {EDUCATION_LIST.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Bio / Apne Baare Mein Likhein</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  className="input-field"
                  rows={4}
                  placeholder="Apne baare mein kuch likhein — parivaar, shauq, kya dhundh rahe hain..."
                  maxLength={500}
                />
                <span style={{fontSize:'12px',color:'var(--text-light)'}}>{formData.bio.length}/500</span>
              </div>
              <div className="form-row">
                <button className="btn-outline" onClick={() => setStep(1)}>← Wapas</button>
                <button className="btn-primary" onClick={() => setStep(3)}>Aage →</button>
              </div>
            </div>
          )}

          {/* Step 3: Photo */}
          {step === 3 && (
            <div className="reg-step">
              <div className="auth-header">
                <h2>📸 Photo Lagayein</h2>
                <p>Achhi tasveer se zyada proposals milte hain!</p>
              </div>
              <div className="photo-upload-area" onClick={() => document.getElementById('photoInput').click()}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="photo-preview-img" />
                ) : (
                  <div className="photo-placeholder">
                    <span className="photo-icon">📷</span>
                    <p>Yahan click karke photo lagayein</p>
                    <span className="photo-hint">JPG, PNG — Max 5MB</span>
                  </div>
                )}
                <input id="photoInput" type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}} />
              </div>
              <div className="form-row" style={{marginTop: 20}}>
                <button className="btn-outline" onClick={() => setStep(2)}>← Wapas</button>
                <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? '⏳ Ho raha hai...' : '🎉 Profile Banayein!'}
                </button>
              </div>
              <button className="skip-btn" onClick={handleSubmit} disabled={loading}>
                Photo baad mein lagayein →
              </button>
            </div>
          )}

          <div className="auth-divider"><span>Pehle se Account hai?</span></div>
          <Link to="/login" className="auth-switch-btn">Login Karein</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
