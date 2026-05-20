import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TopAdBanner, SidebarAd, InlineAd } from '../components/AdBanner';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import logo from '../assest/logo.png';
import heroVideo from '../assest/1.mp4';
import { DUMMY_PROFILES } from '../utils/dummyData';

const STATS = [
  { num: '50,000+', label: 'Registered Profiles', icon: '👥' },
  { num: '8,000+', label: 'Successful Marriages', icon: '💑' },
  { num: '38', label: 'Bihar Districts', icon: '📍' },
  { num: '100%', label: 'Verified Profiles', icon: '✅' },
];

const TESTIMONIALS = [
  { name: 'Shreya & Rohit', location: 'Patna', text: 'SaathiShaadi pe humari mulaqat hui aur aaj hum saath hain. Bahut accha platform hai Bihar ke liye!', img: 'https://randomuser.me/api/portraits/women/68.jpg' },
  { name: 'Neha & Amit', location: 'Muzaffarpur', text: 'Is platform ne meri zindagi badal di. Bihar ka best matrimonial site hai ye bilkul.', img: 'https://randomuser.me/api/portraits/women/72.jpg' },
  { name: 'Kavya & Vikash', location: 'Gaya', text: 'Bahut asaan hai yahan profile banana aur proposal bhejana. Highly recommend!', img: 'https://randomuser.me/api/portraits/women/85.jpg' },
];

const Home = () => {
  const { user } = useAuth();
  const [featuredProfiles, setFeaturedProfiles] = useState([]);

  useEffect(() => {
    // Load some profiles as featured
    api.get('/users?limit=6').then(res => {
      setFeaturedProfiles(res.data.users?.length ? res.data.users : DUMMY_PROFILES);
    }).catch(() => setFeaturedProfiles(DUMMY_PROFILES));
  }, []);

  return (
    <div>
      <TopAdBanner />

      {/* Hero Section */}
     <section style={styles.hero}>

  <video
    autoPlay
    muted
    loop
    playsInline
    style={styles.heroVideo}
  >
    <source src={heroVideo} type="video/mp4" />
  </video>

  <div style={styles.heroOverlay} />
  
        <div style={styles.heroContent}>
          <div style={styles.heroBadge}>
            <img src={logo} alt="" style={styles.badgeLogo} />
            Bihar ka #1 Vivah Portal
          </div>
          <h1 style={styles.heroTitle}>
            अपना जीवनसाथी<br />
            <span style={styles.heroHighlight}>Bihar में ढूंढें</span>
          </h1>
          <p style={styles.heroSub}>
            SaathiShaadi par 50,000+ verified profiles. Safe, Simple aur Seedha.<br />
            Register karen aur apna perfect match dhundhen — bilkul free!
          </p>
          <div style={styles.heroActions}>
            {user ? (
              <Link to="/browse" style={styles.heroCta}>Browse Profiles →</Link>
            ) : (
              <>
                <Link to="/register" style={styles.heroCta}>अभी Register करें — Free</Link>
                <Link to="/login" style={styles.heroLogin}>Login करें</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={styles.statsBar}>
        {STATS.map((s, i) => (
          <div key={i} style={styles.stat}>
            <div style={styles.statIcon}>{s.icon}</div>
            <div style={styles.statNum}>{s.num}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </section>

      <div style={styles.mainLayout}>
        <div style={styles.mainContent}>
          {/* How It Works */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>कैसे काम करता है?</h2>
            <div style={styles.steps}>
              {[
                { step: '1', title: 'Register करें', desc: 'अपना Mobile Number दें, OTP verify करें और profile बनाएं', icon: '📝' },
                { step: '2', title: 'Profile Browse करें', desc: 'Religion, Age और District के हिसाब से matches देखें', icon: '🔍' },
                { step: '3', title: 'Proposal भेजें', desc: 'पसंद आए तो Marriage Proposal भेजें', icon: '💌' },
                { step: '4', title: 'Chat & Call करें', desc: 'Proposal accept होने पर Chat, Voice और Video Call करें', icon: '📞' },
              ].map((s, i) => (
                <div key={i} style={styles.stepCard}>
                  <div style={styles.stepNum}>{s.step}</div>
                  <div style={styles.stepIcon}>{s.icon}</div>
                  <h3 style={styles.stepTitle}>{s.title}</h3>
                  <p style={styles.stepDesc}>{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <InlineAd />

          {/* Featured Profiles */}
          {featuredProfiles.length > 0 && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Featured Profiles</h2>
              <div style={styles.profilesGrid}>
                {featuredProfiles.map((p) => (
                  <Link key={p._id} to={user ? `/profile/${p._id}` : '/login'} style={styles.miniCard}>
                    <img
                      src={p.photo
                        ? p.photo.startsWith('http')
                          ? p.photo
                          : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${p.photo}`
                        : `https://randomuser.me/api/portraits/${p.gender === 'Male' ? 'men' : 'women'}/${p.gender === 'Male' ? 63 : 90}.jpg`}
                      alt={p.name}
                      style={styles.miniImg}
                      onError={(e) => { e.target.src = `https://randomuser.me/api/portraits/${p.gender === 'Male' ? 'men' : 'women'}/1.jpg`; }}
                    />
                    <div style={styles.miniInfo}>
                      <div style={styles.miniName}>{p.name}</div>
                      <div style={styles.miniDetail}>{p.age} yr • {p.district || 'Bihar'}</div>
                    </div>
                  </Link>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Link to={user ? '/browse' : '/register'} style={styles.browseBtn}>
                  सभी Profiles देखें →
                </Link>
              </div>
            </section>
          )}

          {/* Testimonials */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Success Stories 💑</h2>
            <div style={styles.testimonials}>
              {TESTIMONIALS.map((t, i) => (
                <div key={i} style={styles.testimonialCard}>
                  <img src={t.img} alt={t.name} style={styles.testimonialImg} />
                  <p style={styles.testimonialText}>"{t.text}"</p>
                  <div style={styles.testimonialName}>{t.name}</div>
                  <div style={styles.testimonialLocation}>📍 {t.location}, Bihar</div>
                </div>
              ))}
            </div>
          </section>

          {/* Features */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>हमारी खासियत</h2>
            <div style={styles.features}>
              {[
                { icon: '🔒', title: 'Privacy First', desc: 'आपका number और details safe. Sirf proposal accept ke baad hi contact hoga.' },
                { icon: '📱', title: 'Real-time Chat', desc: 'Match ke baad instant chat, voice aur video call ki suvidha.' },
                { icon: '🆓', title: 'Bilkul Free', desc: 'Registration se lekar proposal tak — sab kuch free hai.' },
                { icon: '✅', title: 'Bihar Focused', desc: 'Sirf Bihar ke logon ke liye banaya gaya — local communities aur castes ke saath.' },
              ].map((f, i) => (
                <div key={i} style={styles.featureCard}>
                  <div style={styles.featureIcon}>{f.icon}</div>
                  <h3 style={styles.featureTitle}>{f.title}</h3>
                  <p style={styles.featureDesc}>{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div style={styles.sidebar}>
          {!user && (
            <div style={styles.sidebarWidget}>
              <h3 style={styles.widgetTitle}>Quick Register</h3>
              <p style={styles.widgetText}>Bihar ka sabse bada vivah portal. Abhi join karein!</p>
              <Link to="/register" style={styles.widgetBtn}>Register Free</Link>
            </div>
          )}
          <SidebarAd />
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div>
            <div style={styles.footerLogo}>
              <img src={logo} alt="SaathiShaadi" style={styles.footerLogoImg} />
              <span>SaathiShaadi</span>
            </div>
            <p style={styles.footerText}>Bihar ka Apna Vivah Portal</p>
          </div>
          <div>
            <div style={styles.footerHeading}>Links</div>
            <Link to="/" style={styles.footerLink}>Home</Link>
            <Link to="/browse" style={styles.footerLink}>Browse</Link>
            <Link to="/register" style={styles.footerLink}>Register</Link>
          </div>
          <div>
            <div style={styles.footerHeading}>Support</div>
            <a href="tel:9999999999" style={styles.footerLink}>📞 9999999999</a>
            <a href="mailto:help@saathishaadi.in" style={styles.footerLink}>✉️ help@saathishaadi.in</a>
          </div>
        </div>
        <div style={styles.footerBottom}>
          © 2025 SaathiShaadi.in | Bihar | All Rights Reserved
        </div>
      </footer>
    </div>
  );
};

const styles = {
  hero: {
    minHeight: 680, position: 'relative',
    background: 'linear-gradient(135deg, #1a0a0a 0%, #2d1010 40%, #4a1515 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  heroVideo: {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  zIndex: 1,
},
  heroOverlay: {
  position: 'absolute',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 1,
},
  heroContent: {
    textAlign: 'center', padding: '60px 20px', position: 'relative', zIndex: 1,
  },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent',
    border: '1px solid rgba(212,160,23,0.5)', color: '#FFD700',
    padding: '6px 18px', borderRadius: 20, fontSize: 13,
    fontFamily: "'Hindi', sans-serif", marginBottom: 20,
  },
  badgeLogo: { width: 22, height: 22, objectFit: 'contain' },
  heroTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 52, fontWeight: 800, color: '#fff',
    lineHeight: 1.2, marginBottom: 20,
  },
  heroHighlight: { color: '#d4a017' },
  heroSub: {
    color: '#c8a882', fontSize: 16, lineHeight: 1.8, maxWidth: 560,
    margin: '0 auto 32px', fontFamily: "'Hind', sans-serif",
  },
  heroActions: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' },
  heroCta: {
    background: 'linear-gradient(135deg, #c0392b, #96281b)',
    color: 'white', textDecoration: 'none', padding: '14px 32px',
    borderRadius: 10, fontFamily: "'Hind', sans-serif", fontWeight: 700, fontSize: 16,
    boxShadow: '0 6px 20px rgba(192,57,43,0.5)',
  },
  heroLogin: {
    background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)',
    color: 'white', textDecoration: 'none', padding: '12px 28px',
    borderRadius: 10, fontFamily: "'Hind', sans-serif", fontWeight: 600, fontSize: 16,
  },
  statsBar: {
    background: 'linear-gradient(135deg, #c0392b, #96281b)',
    display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0,
  },
  stat: {
    padding: '24px 40px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)',
  },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statNum: {
    fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#fff',
  },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: "'Hind', sans-serif" },
  mainLayout: {
    maxWidth: 1200, margin: '0 auto', padding: '32px 20px',
    display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32,
  },
  mainContent: {},
  sidebar: { display: 'flex', flexDirection: 'column', gap: 20 },
  section: { marginBottom: 48 },
  sectionTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: 28,
    color: '#1a0a0a', marginBottom: 24, paddingBottom: 12,
    borderBottom: '3px solid #c0392b', display: 'inline-block',
  },
  steps: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 },
  stepCard: {
    background: 'white', borderRadius: 14, padding: '24px 20px',
    textAlign: 'center', boxShadow: '0 2px 12px rgba(192,57,43,0.1)',
    border: '1px solid #f0e0d0',
  },
  stepNum: {
    width: 36, height: 36, background: '#c0392b', color: 'white',
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 16, margin: '0 auto 8px', fontFamily: "'Hind', sans-serif",
  },
  stepIcon: { fontSize: 32, marginBottom: 10 },
  stepTitle: { fontFamily: "'Playfair Display', serif", fontSize: 16, marginBottom: 8, color: '#1a0a0a' },
  stepDesc: { fontSize: 13, color: '#7a5c52', fontFamily: "'Hind', sans-serif", lineHeight: 1.6 },
  profilesGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16,
  },
  miniCard: {
    background: 'white', borderRadius: 12, overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textDecoration: 'none',
    transition: 'transform 0.2s',
  },
  miniImg: { width: '100%', height: 150, objectFit: 'cover', display: 'block' },
  miniInfo: { padding: '10px 12px' },
  miniName: { fontFamily: "'Playfair Display', serif", fontSize: 15, color: '#1a0a0a', fontWeight: 600 },
  miniDetail: { fontSize: 12, color: '#7a5c52', fontFamily: "'Hind', sans-serif" },
  browseBtn: {
    display: 'inline-block', background: 'linear-gradient(135deg, #c0392b, #96281b)',
    color: 'white', padding: '12px 28px', borderRadius: 8, textDecoration: 'none',
    fontFamily: "'Hind', sans-serif", fontWeight: 600, fontSize: 15,
  },
  testimonials: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 },
  testimonialCard: {
    background: 'white', borderRadius: 14, padding: '24px 20px',
    textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  testimonialImg: {
    width: 70, height: 70, borderRadius: '50%', objectFit: 'cover',
    border: '3px solid #c0392b', margin: '0 auto 14px',
  },
  testimonialText: {
    fontSize: 14, color: '#5a4040', fontFamily: "'Hind', sans-serif",
    lineHeight: 1.7, fontStyle: 'italic', marginBottom: 12,
  },
  testimonialName: { fontFamily: "'Playfair Display', serif", fontSize: 15, color: '#1a0a0a', fontWeight: 600 },
  testimonialLocation: { fontSize: 12, color: '#7a5c52', fontFamily: "'Hind', sans-serif" },
  features: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 },
  featureCard: {
    background: 'white', borderRadius: 14, padding: '24px 20px',
    borderLeft: '4px solid #c0392b', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  featureIcon: { fontSize: 32, marginBottom: 10 },
  featureTitle: { fontFamily: "'Playfair Display', serif", fontSize: 17, marginBottom: 8, color: '#1a0a0a' },
  featureDesc: { fontSize: 13, color: '#7a5c52', fontFamily: "'Hind', sans-serif", lineHeight: 1.6 },
  sidebarWidget: {
    background: 'linear-gradient(135deg, #1a0a0a, #2d1010)', borderRadius: 14,
    padding: '20px 16px', textAlign: 'center', border: '1px solid #d4a017',
  },
  widgetTitle: {
    fontFamily: "'Playfair Display', serif", color: '#d4a017', fontSize: 20, marginBottom: 10,
  },
  widgetText: { fontSize: 13, color: '#c8a882', fontFamily: "'Hind', sans-serif", marginBottom: 16, lineHeight: 1.6 },
  widgetBtn: {
    display: 'block', background: 'linear-gradient(135deg, #c0392b, #96281b)',
    color: 'white', padding: '12px', borderRadius: 8, textDecoration: 'none',
    fontFamily: "'Hind', sans-serif", fontWeight: 700,
  },
  footer: {
    background: '#1a0a0a', borderTop: '3px solid #d4a017', marginTop: 40,
  },
  footerInner: {
    maxWidth: 1200, margin: '0 auto', padding: '40px 20px',
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32,
  },
  footerLogo: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: "'Playfair Display', serif", fontSize: 22,
    color: '#d4a017', marginBottom: 8,
  },
  footerLogoImg: { width: 34, height: 34, objectFit: 'contain' },
  footerText: { fontSize: 13, color: '#7a5c52', fontFamily: "'Hind', sans-serif" },
  footerHeading: {
    fontFamily: "'Playfair Display', serif", color: '#c8a882',
    fontSize: 15, marginBottom: 12, fontWeight: 600,
  },
  footerLink: {
    display: 'block', color: '#7a5c52', textDecoration: 'none',
    fontSize: 13, fontFamily: "'Hind', sans-serif", marginBottom: 6,
  },
  footerBottom: {
    borderTop: '1px solid #2d1010', padding: '16px 20px',
    textAlign: 'center', color: '#5a4040', fontSize: 13,
    fontFamily: "'Hind', sans-serif",
  },
};

export default Home;
