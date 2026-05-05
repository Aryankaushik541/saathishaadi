import React from 'react';
import { useNavigate } from 'react-router-dom';

const ProfileCard = ({ profile, onPropose, proposalSent }) => {
  const navigate = useNavigate();
  const imgFallback = profile.gender === 'Male'
    ? `https://randomuser.me/api/portraits/men/${((profile._id?.charCodeAt(1) || 4) % 8) * 8 + 22}.jpg`
    : `https://randomuser.me/api/portraits/women/${((profile._id?.charCodeAt(1) || 3) % 8) * 7 + 21}.jpg`;
  const imageUrl = profile.photo
    ? profile.photo.startsWith('http')
      ? profile.photo
      : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${profile.photo}`
    : imgFallback;

  return (
    <div className="card" style={styles.card}>
      <div style={styles.imgWrap}>
        <img
          src={imageUrl}
          alt={profile.name}
          style={styles.img}
          onError={(e) => { e.target.src = imgFallback; }}
        />
        <div style={styles.badge}>{profile.religion}</div>
      </div>
      <div style={styles.body}>
        <h3 style={styles.name}>{profile.name}</h3>
        <div style={styles.details}>
          <span>🎂 {profile.age} वर्ष</span>
          <span>📍 {profile.district || 'Bihar'}</span>
        </div>
        <div style={styles.details}>
          <span>💼 {profile.profession || 'N/A'}</span>
          {profile.caste && <span>🏛️ {profile.caste}</span>}
        </div>
        {profile.bio && (
          <p style={styles.bio}>{profile.bio.substring(0, 80)}{profile.bio.length > 80 ? '...' : ''}</p>
        )}
        <div style={styles.actions}>
          <button onClick={() => navigate(`/profile/${profile._id}`)} style={styles.viewBtn}>
            👁️ Profile देखें
          </button>
          {onPropose && (
            <button
              onClick={() => onPropose(profile._id)}
              disabled={proposalSent}
              style={proposalSent ? styles.sentBtn : styles.proposeBtn}
            >
              {proposalSent ? '✅ Proposal Sent' : '💌 Proposal भेजें'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  card: { maxWidth: 300, width: '100%' },
  imgWrap: { position: 'relative', height: 220, overflow: 'hidden' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  badge: {
    position: 'absolute', top: 10, right: 10,
    background: 'rgba(192,57,43,0.9)', color: 'white',
    padding: '3px 10px', borderRadius: 20, fontSize: 12,
    fontFamily: "'Hind', sans-serif", fontWeight: 600,
  },
  body: { padding: '16px 14px' },
  name: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 20, color: '#1a0a0a', marginBottom: 8,
  },
  details: {
    display: 'flex', gap: 12, fontSize: 13,
    color: '#7a5c52', marginBottom: 4, fontFamily: "'Hind', sans-serif",
  },
  bio: {
    fontSize: 13, color: '#5a4040', marginTop: 8,
    fontFamily: "'Hind', sans-serif", lineHeight: 1.5,
  },
  actions: { marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' },
  viewBtn: {
    flex: 1, padding: '8px 12px', background: 'transparent',
    border: '2px solid #c0392b', color: '#c0392b', borderRadius: 8,
    cursor: 'pointer', fontSize: 13, fontFamily: "'Hind', sans-serif", fontWeight: 600,
  },
  proposeBtn: {
    flex: 1, padding: '8px 12px',
    background: 'linear-gradient(135deg, #c0392b, #96281b)',
    color: 'white', border: 'none', borderRadius: 8,
    cursor: 'pointer', fontSize: 13, fontFamily: "'Hind', sans-serif", fontWeight: 600,
  },
  sentBtn: {
    flex: 1, padding: '8px 12px', background: '#27ae60',
    color: 'white', border: 'none', borderRadius: 8,
    fontSize: 13, fontFamily: "'Hind', sans-serif", cursor: 'not-allowed',
  },
};

export default ProfileCard;
