import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DUMMY_PROFILES, DUMMY_ADS } from '../utils/dummyData';
import ProfileCard from '../components/ProfileCard';
import { TopAdBanner, InlineAdBanner } from '../components/AdBanner';
import './HomePage.css';

const STATS = [
  { num: '50,000+', label: 'Bihar Profiles', icon: '👥' },
  { num: '12,000+', label: 'Rishte Bane', icon: '💍' },
  { num: '38', label: 'Jilon Mein', icon: '🗺️' },
  { num: '99%', label: 'Success Rate', icon: '⭐' },
];

const FEATURES = [
  { icon: '🔍', title: 'Smart Search', desc: 'Religion, caste, age, location se apna match dhundhe' },
  { icon: '💌', title: 'Propose Karo', desc: 'Seedha proposal bhejo, accept hone par baat karein' },
  { icon: '💬', title: 'Private Chat', desc: 'Proposal accept hone ke baad hi chat hogi, privacy pehle' },
  { icon: '📹', title: 'Video & Voice Call', desc: 'Seedha video ya voice call karo, WebRTC se secure' },
  { icon: '🔒', title: 'Privacy First', desc: 'Photo sirf proposal ke baad dikhegi, aapki marzi' },
  { icon: '✅', title: 'Verified Profiles', desc: 'Phone number se verify hote hain sabhi profiles' },
];

const TESTIMONIALS = [
  { name: 'Rani & Rajesh', location: 'Patna', text: 'SaathiShaadi se hi hamara rishta hua. Bahut aasan process thi!', img: 'https://randomuser.me/api/portraits/women/90.jpg' },
  { name: 'Komal & Vikash', location: 'Gaya', text: 'Proposal bheja, accept hua, chat ki aur phir shaadi! Ek mahine mein sab ho gaya.', img: 'https://randomuser.me/api/portraits/women/91.jpg' },
  { name: 'Madhuri & Arun', location: 'Muzaffarpur', text: 'Bihar ka best matrimonial platform. Families ko bhi bahut pasand aaya.', img: 'https://randomuser.me/api/portraits/women/92.jpg' },
];

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState({ gender: '', religion: '' });

  const featured = DUMMY_PROFILES.slice(0, 4);

  return (
    <div className="home-page">
      <TopAdBanner />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg-pattern"></div>
        <div className="hero-content">
          <div className="hero-badge">🪷 Bihar Ka No.1 Vivah Portal</div>
          <h1 className="hero-title">
            Apna <span className="hero-highlight">Saathi</span> Dhundhe<br/>
            <span className="hero-sub-title">Bihar Mein</span>
          </h1>
          <p className="hero-desc">
            Patna se Purnia, Gaya se Gopalganj — Bihar ke koone koone se lakho rishte. 
            Simple, Safe aur Seedha.
          </p>
          <div className="hero-actions">
            {user ? (
              <button className="btn-primary hero-cta" onClick={() => navigate('/browse')}>
                🔍 Profiles Dekhein
              </button>
            ) : (
              <>
                <Link to="/register" className="hero-cta-link btn-primary">
                  🌸 Free Register Karein
                </Link>
                <Link to="/login" className="hero-cta-link btn-outline">
                  Login Karein
                </Link>
              </>
            )}
          </div>
          <div className="hero-trust">
            <span>✅ Free Registration</span>
            <span>✅ OTP Verified</span>
            <span>✅ Bihar Special</span>
          </div>
        </div>
        <div className="hero-illustration">
          <div className="hero-card-stack">
            {DUMMY_PROFILES.slice(0, 3).map((p, i) => (
              <div key={p._id} className={`hero-mini-card hmc-${i}`}>
                <img src={p.photo} alt={p.name} />
                <div>
                  <div className="hmc-name">{p.name}</div>
                  <div className="hmc-info">{p.age} • {p.location}</div>
                </div>
                <span className={`hmc-badge ${i === 0 ? 'hmc-new' : i === 1 ? 'hmc-active' : 'hmc-popular'}`}>
                  {i === 0 ? 'New' : i === 1 ? 'Online' : 'Popular'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
        {STATS.map((s, i) => (
          <div key={i} className="stat-item">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Featured Profiles */}
      <section className="featured-section page-container">
        <div className="section-title">
          <h2>✨ Featured Profiles</h2>
          <p>Bihar ke selected aur verified profiles</p>
          <div className="divider"></div>
        </div>

        {/* Quick Filter */}
        <div className="quick-filter">
          <select
            className="input-field filter-select"
            value={filter.gender}
            onChange={e => setFilter(p => ({...p, gender: e.target.value}))}
          >
            <option value="">All Genders</option>
            <option value="Male">Ladke</option>
            <option value="Female">Ladkiyan</option>
          </select>
          <select
            className="input-field filter-select"
            value={filter.religion}
            onChange={e => setFilter(p => ({...p, religion: e.target.value}))}
          >
            <option value="">All Religions</option>
            <option value="Hindu">Hindu</option>
            <option value="Muslim">Muslim</option>
            <option value="Christian">Christian</option>
          </select>
          <button className="btn-primary" onClick={() => navigate('/browse')}>
            More Profiles →
          </button>
        </div>

        <div className="profiles-grid">
          {featured
            .filter(p => (!filter.gender || p.gender === filter.gender) && (!filter.religion || p.religion === filter.religion))
            .map(profile => (
              <ProfileCard key={profile._id} profile={profile} />
            ))}
        </div>

        <div style={{textAlign:'center', marginTop: 32}}>
          <Link to={user ? '/browse' : '/register'} className="btn-gold" style={{textDecoration:'none',padding:'14px 40px',borderRadius:'30px',display:'inline-block'}}>
            🌸 Sabhi Profiles Dekhein
          </Link>
        </div>
      </section>

      <div className="page-container">
        <InlineAdBanner />
      </div>

      {/* How It Works */}
      <section className="how-section">
        <div className="page-container">
          <div className="section-title">
            <h2>Kaise Kaam Karta Hai?</h2>
            <p>Sirf 4 simple steps mein apna rishta pakka karein</p>
            <div className="divider"></div>
          </div>
          <div className="steps-row">
            {[
              { n: '1', icon: '📝', title: 'Register Karein', desc: 'Phone number se OTP verify karein aur profile banayein' },
              { n: '2', icon: '🔍', title: 'Profile Dhundhe', desc: 'Religion, age aur location se apna perfect match khoje' },
              { n: '3', icon: '💌', title: 'Proposal Bhejein', desc: 'Pasand aaye toh seedha Marriage Proposal bhejein' },
              { n: '4', icon: '💬', title: 'Chat & Call Karein', desc: 'Accept hone par chat, voice ya video call karein' },
            ].map((step, i) => (
              <div key={i} className="step-card">
                <div className="step-num">{step.n}</div>
                <div className="step-icon">{step.icon}</div>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
                {i < 3 && <div className="step-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section page-container">
        <div className="section-title">
          <h2>Kyun Chunein SaathiShaadi?</h2>
          <p>Bihar ke log, Bihar ke liye</p>
          <div className="divider"></div>
        </div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="page-container">
          <div className="section-title">
            <h2>Khush Jodi ☺️</h2>
            <p>Jinki Shaadi Huyi Unki Kahaniyan</p>
            <div className="divider"></div>
          </div>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="testi-header">
                  <img src={t.img} alt={t.name} className="testi-img" />
                  <div>
                    <div className="testi-name">💑 {t.name}</div>
                    <div className="testi-loc">📍 {t.location}</div>
                  </div>
                </div>
                <p className="testi-text">"{t.text}"</p>
                <div className="testi-stars">⭐⭐⭐⭐⭐</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Aaj Hi Apna Saathi Dhundhe 🪷</h2>
          <p>Bihar ke 50,000+ registered profiles mein se apna match khoje. Free mein!</p>
          <Link to="/register" className="btn-gold cta-btn">
            🌸 Abhi Register Karein — Free!
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="page-container">
          <div className="footer-top">
            <div className="footer-brand">
              <h3>🪷 SaathiShaadi</h3>
              <p>Bihar ka Apna Vivah Portal</p>
              <p style={{fontSize:'12px',marginTop:8,color:'#aaa'}}>
                Patna, Bihar, India 800001
              </p>
            </div>
            <div className="footer-links">
              <h5>Quick Links</h5>
              <Link to="/">Home</Link>
              <Link to="/browse">Browse Profiles</Link>
              <Link to="/register">Register Free</Link>
              <Link to="/login">Login</Link>
            </div>
            <div className="footer-links">
              <h5>Help</h5>
              <Link to="/pages/privacy-policy">Privacy Policy</Link>
              <Link to="/pages/terms">Terms of Use</Link>
              <Link to="/pages/contact">Contact Us</Link>
              <Link to="/pages/about">About Us</Link>
            </div>
            <div className="footer-links">
              <h5>Religions</h5>
              <Link to="/pages/hindu-vivah">Hindu Vivah</Link>
              <Link to="/pages/muslim-nikah">Muslim Nikah</Link>
              <Link to="/pages/christian-match">Christian Match</Link>
              <Link to="/pages/all-religions">All Religions</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 SaathiShaadi.com — Bihar Ka No.1 Matrimonial Platform</p>
            <p style={{color:'#aaa',fontSize:'12px',marginTop:4}}>Made with ❤️ for Bihar</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
