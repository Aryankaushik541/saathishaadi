import React from 'react';

const ads = [
  { text: '🏠 Property in Patna - 2BHK from ₹25 Lakh', color: '#1a5276', url: '#' },
  { text: '💍 Kajal Jewellers - Vivah Ke Liye Best Gold', color: '#7d6608', url: '#' },
  { text: '🎒 Shadi Package - Tent, Catering & More | Patna', color: '#1a5276', url: '#' },
  { text: '📸 Wedding Photography - Call 9876543210', color: '#922b21', url: '#' },
  { text: '🎵 DJ & Band Baaja | Best Price in Bihar', color: '#1b4f72', url: '#' },
];

export const TopAdBanner = () => {
  const ad = ads[Math.floor(Math.random() * ads.length)];
  return (
    <div style={{ background: ad.color, padding: '8px 20px', textAlign: 'center' }}>
      <a href={ad.url} style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontFamily: "'Hind', sans-serif" }}>
        📢 विज्ञापन: {ad.text} | <span style={{ textDecoration: 'underline' }}>Click Here</span>
      </a>
    </div>
  );
};

export const SidebarAd = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {ads.slice(0, 3).map((ad, i) => (
      <div key={i} style={{
        background: ad.color, borderRadius: 10, padding: '16px 14px',
        color: 'white', fontSize: 13, fontFamily: "'Hind', sans-serif",
        cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>ADVERTISEMENT</div>
        {ad.text}
      </div>
    ))}
    <div style={{
      background: 'linear-gradient(135deg, #c0392b, #922b21)',
      borderRadius: 10, padding: 16, color: 'white',
      fontFamily: "'Playfair Display', serif", textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>अपना विज्ञापन दें</div>
      <div style={{ fontSize: 12, opacity: 0.9 }}>Bihar ke lakho logon tak pahunche</div>
      <button style={{
        marginTop: 10, background: '#d4a017', border: 'none', color: '#1a0a0a',
        padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer',
        fontFamily: "'Hind', sans-serif",
      }}>Contact Us</button>
    </div>
  </div>
);

export const InlineAd = () => {
  const ad = ads[Math.floor(Math.random() * ads.length)];
  return (
    <div style={{
      background: `linear-gradient(135deg, ${ad.color}, ${ad.color}dd)`,
      borderRadius: 12, padding: '14px 20px', color: 'white',
      fontFamily: "'Hind', sans-serif", fontSize: 13,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      cursor: 'pointer', margin: '16px 0',
    }}>
      <span>📢 {ad.text}</span>
      <span style={{ fontSize: 11, opacity: 0.7, border: '1px solid rgba(255,255,255,0.4)', padding: '2px 8px', borderRadius: 4 }}>Ad</span>
    </div>
  );
};
