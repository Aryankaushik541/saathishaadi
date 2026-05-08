import React, { useState, useEffect, useCallback } from 'react';
import ProfileCard from '../components/ProfileCard';
import { InlineAd, TopAdBanner } from '../components/AdBanner';
import { RELIGIONS, BIHAR_DISTRICTS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Browse = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentProposals, setSentProposals] = useState([]);
  const [filters, setFilters] = useState({
    religion: '', minAge: '', maxAge: '', district: '',
    gender: user?.gender === 'Male' ? 'Female' : 'Male'
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12, ...filters });
      Object.keys(filters).forEach(k => !filters[k] && params.delete(k));
      const res = await api.get(`/users?${params}`);
      setProfiles(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
    } catch { toast.error('Profiles load karne mein error'); }
    setLoading(false);
  }, [filters, page]);

  const fetchSentProposals = useCallback(async () => {
    try {
      const res = await api.get('/proposals/sent');
      setSentProposals(res.data.map(p => p.receiver._id || p.receiver));
    } catch {}
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);
  useEffect(() => { fetchSentProposals(); }, [fetchSentProposals]);

  const handlePropose = async (receiverId) => {
    try {
      await api.post('/proposals', { receiverId });
      setSentProposals([...sentProposals, receiverId]);
      toast.success('💌 Proposal bhej diya gaya!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error sending proposal');
    }
  };

  return (
    <div>
      <TopAdBanner />
      <div style={styles.page}>
        <h1 style={styles.title}>Profiles Browse Karein</h1>
        <p style={styles.sub}>Bihar ke registered profiles mein se apna match dhundhen</p>

        {/* Filters */}
        <div style={styles.filters}>
          <select value={filters.gender} onChange={e => setFilters({...filters, gender: e.target.value})} style={styles.filter}>
            <option value="">Koi bhi Gender</option>
            <option value="Male">Purush (Male)</option>
            <option value="Female">Mahila (Female)</option>
          </select>
          <select value={filters.religion} onChange={e => setFilters({...filters, religion: e.target.value})} style={styles.filter}>
            <option value="">Koi bhi Dharm</option>
            {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filters.district} onChange={e => setFilters({...filters, district: e.target.value})} style={styles.filter}>
            <option value="">Koi bhi Zila</option>
            {BIHAR_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input type="number" placeholder="Min Age" value={filters.minAge}
            onChange={e => setFilters({...filters, minAge: e.target.value})}
            style={{ ...styles.filter, maxWidth: 100 }} min={18} max={60} />
          <input type="number" placeholder="Max Age" value={filters.maxAge}
            onChange={e => setFilters({...filters, maxAge: e.target.value})}
            style={{ ...styles.filter, maxWidth: 100 }} min={18} max={60} />
          <button onClick={() => { setFilters({ religion: '', minAge: '', maxAge: '', district: '', gender: '' }); setPage(1); }} style={styles.clearBtn}>
            Clear ✕
          </button>
        </div>

        {loading ? (
          <div className="loader" />
        ) : profiles.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🔍</div>
            <h3 style={{ fontFamily: "'Playfair Display', serif" }}>Koi profile nahi mila</h3>
            <p>Filter change karein ya baad mein dobara try karein</p>
          </div>
        ) : (
          <>
            <div style={styles.grid}>
              {profiles.map((p, i) => (
                <React.Fragment key={p._id}>
                  <ProfileCard
                    profile={p}
                    onPropose={p._id !== user?._id ? handlePropose : null}
                    proposalSent={sentProposals.includes(p._id)}
                  />
                  {i === 5 && <div style={{ gridColumn: '1/-1' }}><InlineAd /></div>}
                </React.Fragment>
              ))}
            </div>

            <div style={styles.pagination}>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} style={styles.pageBtn}>← Pichla</button>
              <span style={styles.pageInfo}>Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} style={styles.pageBtn}>Agla →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '32px 20px' },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 32, color: '#1a0a0a', marginBottom: 8 },
  sub: { fontSize: 15, color: '#7a5c52', fontFamily: "'Hind', sans-serif", marginBottom: 24 },
  filters: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28, alignItems: 'center' },
  filter: { padding: '10px 14px', border: '2px solid #e8d5c4', borderRadius: 8, fontFamily: "'Hind', sans-serif", fontSize: 14, background: 'white', cursor: 'pointer', outline: 'none', minWidth: 140 },
  clearBtn: { padding: '10px 18px', background: 'transparent', border: '2px solid #c0392b', color: '#c0392b', borderRadius: 8, cursor: 'pointer', fontFamily: "'Hind', sans-serif", fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#7a5c52', fontFamily: "'Hind', sans-serif" },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 40 },
  pageBtn: { padding: '10px 20px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Hind', sans-serif", fontWeight: 600 },
  pageInfo: { fontSize: 15, color: '#7a5c52', fontFamily: "'Hind', sans-serif" },
};

export default Browse;
