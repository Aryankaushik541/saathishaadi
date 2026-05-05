import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RELIGIONS, HINDU_CASTES, MUSLIM_CASTES, BIHAR_DISTRICTS, PROFESSIONS } from '../utils/constants';
import toast from 'react-hot-toast';
import logo from '../assest/logo.png';

const Register = () => {
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=details
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', age: '', gender: '', religion: '', caste: '',
    district: '', profession: '', bio: ''
  });
  const { sendOtp, register } = useAuth();
  const navigate = useNavigate();

  const castesForReligion = form.religion === 'Muslim' ? MUSLIM_CASTES : HINDU_CASTES;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error('Valid email address daalen');
    }
    setLoading(true);
    try {
      await sendOtp(email);
      setStep(2);
      toast.success('OTP aapke email par bheja gaya! ✉️');
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP send karne mein error');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('6 digit OTP daalen');
    // OTP backend pe verify hoga registration ke time
    setStep(3);
    toast.success('Email verified! ✅');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.gender || !form.religion) {
      return toast.error('Sabhi required fields bharen');
    }
    if (form.age < 18 || form.age > 65) {
      return toast.error('Age 18 se 65 ke beech honi chahiye');
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('email', email);
      fd.append('otp', otp);
      if (photo) fd.append('photo', photo);
      await register(fd);
      toast.success('Registration successful! Welcome to SaathiShaadi 🎉');
      navigate('/browse');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration mein error');
      // Agar OTP expire ho gaya to step 1 pe wapas
      if (err.response?.status === 400) setStep(1);
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <img src={logo} alt="SaathiShaadi" style={styles.logo} />
          <h1 style={styles.title}>SaathiShaadi</h1>
          <div style={styles.steps}>
            {[1,2,3].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ ...styles.stepDot, ...(step >= s ? styles.stepActive : {}) }}>{s}</div>
                {s < 3 && <div style={{ ...styles.stepLine, ...(step > s ? styles.stepLineActive : {}) }} />}
              </div>
            ))}
          </div>
          <p style={styles.stepLabel}>
            {step === 1 ? 'Email Address' : step === 2 ? 'OTP Verify' : 'Profile Details'}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <h2 style={styles.formTitle}>Email Address</h2>
            <p style={styles.formSub}>Email OTP se register karein</p>
            <div style={styles.field}>
              <label style={styles.label}>Email Address *</label>
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
            <p style={styles.loginLink}>
              Already registered? <Link to="/login" style={{ color: '#c0392b' }}>Login karein</Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <h2 style={styles.formTitle}>OTP Verify</h2>
            <p style={styles.formSub}>OTP bheja gaya: {email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}</p>
            <div style={styles.field}>
              <label style={styles.label}>6-digit OTP</label>
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                style={{ ...styles.input, textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
                required
                autoComplete="one-time-code"
              />
              <p style={{ fontSize: 12, color: '#c0392b', marginTop: 6, fontFamily: "'Hind', sans-serif" }}>
                ✉️ Email check karein — OTP 10 minutes mein expire hoga
              </p>
            </div>
            <button type="submit" style={styles.btn}>Verify →</button>
            <button type="button" onClick={() => { setStep(1); setOtp(''); }} style={styles.backBtn}>← Email Badlein</button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <h2 style={styles.formTitle}>Profile Details</h2>
            <p style={styles.formSub}>Apni profile banaiye</p>

            {/* Photo Upload */}
            <div style={styles.photoUpload}>
              <input type="file" id="photo" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              <label htmlFor="photo" style={styles.photoLabel}>
                {photoPreview
                  ? <img src={photoPreview} alt="preview" style={styles.photoPreview} />
                  : <div style={styles.photoPlaceholder}>📷<br/><span style={{ fontSize: 12 }}>Photo Upload</span></div>
                }
              </label>
              <p style={{ fontSize: 12, color: '#7a5c52', fontFamily: "'Hind', sans-serif" }}>Photo click karke upload karein (Optional)</p>
            </div>

            <div style={styles.grid2}>
              <div style={styles.field}>
                <label style={styles.label}>Poora Naam *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Apna naam likhein" style={styles.input} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Aayu (Age) *</label>
                <input type="number" min={18} max={65} value={form.age}
                  onChange={e => setForm({...form, age: e.target.value})}
                  placeholder="18-65" style={styles.input} required />
              </div>
            </div>

            <div style={styles.grid2}>
              <div style={styles.field}>
                <label style={styles.label}>Ling (Gender) *</label>
                <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} style={styles.input} required>
                  <option value="">Select karein</option>
                  <option value="Male">Purush (Male)</option>
                  <option value="Female">Mahila (Female)</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Dharm (Religion) *</label>
                <select value={form.religion} onChange={e => setForm({...form, religion: e.target.value, caste: ''})} style={styles.input} required>
                  <option value="">Select karein</option>
                  {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div style={styles.grid2}>
              <div style={styles.field}>
                <label style={styles.label}>Jati (Caste)</label>
                <select value={form.caste} onChange={e => setForm({...form, caste: e.target.value})} style={styles.input}>
                  <option value="">Select karein (Optional)</option>
                  {castesForReligion.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Zila (District)</label>
                <select value={form.district} onChange={e => setForm({...form, district: e.target.value})} style={styles.input}>
                  <option value="">Bihar ka zila chunein</option>
                  {BIHAR_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Peshaa (Profession)</label>
              <select value={form.profession} onChange={e => setForm({...form, profession: e.target.value})} style={styles.input}>
                <option value="">Select karein</option>
                {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Apne Baare Mein (Bio)</label>
              <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})}
                placeholder="Apne baare mein thoda bataiye... (Optional)"
                rows={3} style={{ ...styles.input, resize: 'vertical' }} />
            </div>

            <button type="submit" style={styles.btn} disabled={loading}>
              {loading ? 'Register ho raha hai...' : '✅ Profile Banayein'}
            </button>
          </form>
        )}
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
    background: 'white', borderRadius: 20, padding: '36px 32px',
    maxWidth: 540, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  header: { textAlign: 'center', marginBottom: 24 },
  logo: { width: 64, height: 64, objectFit: 'contain', margin: '0 auto 6px', display: 'block' },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 22, color: '#1a0a0a', marginBottom: 14 },
  steps: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stepDot: {
    width: 32, height: 32, borderRadius: '50%', background: '#e8d5c4',
    color: '#7a5c52', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Hind', sans-serif", fontWeight: 700, fontSize: 14,
  },
  stepActive: { background: '#c0392b', color: 'white' },
  stepLine: { width: 40, height: 2, background: '#e8d5c4' },
  stepLineActive: { background: '#c0392b' },
  stepLabel: { fontSize: 13, color: '#7a5c52', fontFamily: "'Hind', sans-serif" },
  formTitle: { fontFamily: "'Playfair Display', serif", fontSize: 20, color: '#1a0a0a', marginBottom: 4 },
  formSub: { fontSize: 13, color: '#7a5c52', fontFamily: "'Hind', sans-serif", marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#2c1810', marginBottom: 5, fontFamily: "'Hind', sans-serif" },
  input: { width: '100%', padding: '11px 14px', border: '2px solid #e8d5c4', borderRadius: 8, fontFamily: "'Hind', sans-serif", fontSize: 14, color: '#2c1810', outline: 'none', boxSizing: 'border-box' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  photoUpload: { textAlign: 'center', marginBottom: 20 },
  photoLabel: { cursor: 'pointer', display: 'inline-block' },
  photoPreview: { width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid #c0392b' },
  photoPlaceholder: {
    width: 100, height: 100, borderRadius: '50%', background: '#f5ece0',
    border: '3px dashed #c0392b', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto',
    color: '#c0392b',
  },
  btn: {
    width: '100%', padding: '14px', background: 'linear-gradient(135deg, #c0392b, #96281b)',
    color: 'white', border: 'none', borderRadius: 10, fontFamily: "'Hind', sans-serif",
    fontWeight: 700, fontSize: 16, cursor: 'pointer', marginBottom: 10,
  },
  backBtn: {
    width: '100%', padding: '11px', background: 'transparent',
    border: '2px solid #e8d5c4', color: '#7a5c52', borderRadius: 10,
    fontFamily: "'Hind', sans-serif", fontSize: 14, cursor: 'pointer',
  },
  loginLink: { textAlign: 'center', fontSize: 13, color: '#7a5c52', fontFamily: "'Hind', sans-serif", marginTop: 12 },
};

export default Register;
