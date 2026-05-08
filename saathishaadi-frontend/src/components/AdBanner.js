import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const fallbackAds = [
  { text: '🏠 Property in Patna - 2BHK from ₹25 Lakh', color: '#1a5276', url: '#', imageUrl: '' },
  { text: '💍 Kajal Jewellers - Vivah Ke Liye Best Gold', color: '#7d6608', url: '#', imageUrl: '' },
  { text: '🎒 Shadi Package - Tent, Catering & More | Patna', color: '#1a5276', url: '#', imageUrl: '' },
  { text: '📸 Wedding Photography - Call 9876543210', color: '#922b21', url: '#', imageUrl: '' },
  { text: '🎵 DJ & Band Baaja | Best Price in Bihar', color: '#1b4f72', url: '#', imageUrl: '' },
];

// ✅ FIX: imageUrl field ab toAdView mein include hai
const toAdView = (ad) => ({
  id: ad._id,
  text: ad.description ? `${ad.title} - ${ad.description}` : ad.title,
  color: ad.bgColor || '#1a5276',
  url: ad.link || '#',
  imageUrl: ad.imageUrl || '',   // ← YEH LINE MISSING THI — YAHI BUG THA
});

const useAds = (position, fallbackCount = 5) => {
  const [items, setItems] = useState(fallbackAds.slice(0, fallbackCount));

  useEffect(() => {
    let mounted = true;
    api.get(`/ads?position=${position}`)
      .then(res => {
        if (mounted && res.data?.length) setItems(res.data.map(toAdView));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [position]);

  return items;
};

const openAd = (ad) => {
  if (ad.id) api.post(`/ads/${ad.id}/click`).catch(() => {});
  if (ad.url && ad.url !== '#') window.open(ad.url, '_blank', 'noopener,noreferrer');
};

// ✅ FIX: TopAdBanner mein image show hogi (banner style)
export const TopAdBanner = () => {
  const ads = useAds('top');
  const ad = ads[Math.floor(Math.random() * ads.length)];
  return (
    <div
      style={{
        background: ad.color,
        padding: '0',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        minHeight: ad.imageUrl ? 60 : 'auto',
      }}
    >
      {ad.imageUrl ? (
        // Image wala top banner
        <a
          href={ad.url}
          onClick={(e) => { e.preventDefault(); openAd(ad); }}
          style={{ display: 'block', cursor: 'pointer' }}
        >
          <img
            src={ad.imageUrl}
            alt={ad.text}
            style={{
              width: '100%',
              maxHeight: 90,
              objectFit: 'cover',
              display: 'block',
            }}
            onError={(e) => {
              // Image load na ho to text banner dikhao
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <div style={{ display: 'none', padding: '8px 20px' }}>
            <span style={{ color: '#fff', fontSize: 13, fontFamily: "'Hind', sans-serif" }}>
              📢 विज्ञापन: {ad.text} | <span style={{ textDecoration: 'underline' }}>Click Here</span>
            </span>
          </div>
        </a>
      ) : (
        // Text only top banner
        <div style={{ padding: '8px 20px' }}>
          <a
            href={ad.url}
            onClick={(e) => { e.preventDefault(); openAd(ad); }}
            style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontFamily: "'Hind', sans-serif" }}
          >
            📢 विज्ञापन: {ad.text} | <span style={{ textDecoration: 'underline' }}>Click Here</span>
          </a>
        </div>
      )}
    </div>
  );
};

// ✅ FIX: SidebarAd mein image show hogi
export const SidebarAd = () => {
  const ads = useAds('sidebar', 3);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {ads.slice(0, 3).map((ad, i) => (
        <div
          key={ad.id || i}
          onClick={() => openAd(ad)}
          style={{
            background: ad.color,
            borderRadius: 10,
            overflow: 'hidden',
            color: 'white',
            fontSize: 13,
            fontFamily: "'Hind', sans-serif",
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {/* ✅ Image section - agar imageUrl hai to dikhao */}
          {ad.imageUrl && (
            <img
              src={ad.imageUrl}
              alt={ad.text}
              style={{
                width: '100%',
                height: 120,
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          {/* Text section */}
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>ADVERTISEMENT</div>
            {ad.text}
          </div>
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
};

// ✅ FIX: InlineAd mein image show hogi
export const InlineAd = () => {
  const ads = useAds('inline');
  const ad = ads[Math.floor(Math.random() * ads.length)];

  // Agar image hai to image-style inline ad dikhao
  if (ad.imageUrl) {
    return (
      <div
        onClick={() => openAd(ad)}
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          cursor: 'pointer',
          margin: '16px 0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          position: 'relative',
        }}
      >
        <img
          src={ad.imageUrl}
          alt={ad.text}
          style={{ width: '100%', maxHeight: 150, objectFit: 'cover', display: 'block' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        {/* Image ke upar text overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
          padding: '20px 14px 10px',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        }}>
          <span style={{ color: '#fff', fontSize: 13, fontFamily: "'Hind', sans-serif" }}>
            📢 {ad.text}
          </span>
          <span style={{
            fontSize: 11, color: 'rgba(255,255,255,0.8)',
            border: '1px solid rgba(255,255,255,0.4)', padding: '2px 8px', borderRadius: 4,
          }}>Ad</span>
        </div>
      </div>
    );
  }

  // Text only inline ad (pehle jaisa)
  return (
    <div
      onClick={() => openAd(ad)}
      style={{
        background: `linear-gradient(135deg, ${ad.color}, ${ad.color}dd)`,
        borderRadius: 12, padding: '14px 20px', color: 'white',
        fontFamily: "'Hind', sans-serif", fontSize: 13,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', margin: '16px 0',
      }}
    >
      <span>📢 {ad.text}</span>
      <span style={{
        fontSize: 11, opacity: 0.7,
        border: '1px solid rgba(255,255,255,0.4)', padding: '2px 8px', borderRadius: 4,
      }}>Ad</span>
    </div>
  );
};

export const InlineAdBanner = InlineAd;
export const SidebarAds = SidebarAd;
