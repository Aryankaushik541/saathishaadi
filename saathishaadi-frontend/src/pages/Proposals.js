import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Proposals = () => {
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [tab, setTab] = useState('received');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchProposals(); }, []);

  const fetchProposals = async () => {
    try {
      const [r, s] = await Promise.all([api.get('/proposals/received'), api.get('/proposals/sent')]);
      setReceived(r.data); setSent(s.data);
    } catch { toast.error('Proposals load karne mein error'); }
    setLoading(false);
  };

  const handleAction = async (proposalId, action) => {
    try {
      await api.put(`/proposals/${proposalId}`, { status: action });
      toast.success(action === 'accepted' ? '✅ Proposal accept kiya!' : '❌ Proposal reject kiya');
      fetchProposals();
    } catch { toast.error('Error'); }
  };

  const ProfileMini = ({ user, proposal, showActions }) => {
    const imgSrc = user?.photo
      ? `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${user.photo}`
      : `https://randomuser.me/api/portraits/${user?.gender === 'Male' ? 'men' : 'women'}/1.jpg`;

    return (
      <div style={styles.proposalCard}>
        <img src={imgSrc} alt={user?.name} style={styles.avatar}
          onError={e => { e.target.src = `https://randomuser.me/api/portraits/${user?.gender === 'Male' ? 'men' : 'women'}/1.jpg`; }} />
        <div style={styles.info}>
          <h3 style={styles.name} onClick={() => navigate(`/profile/${user?._id}`)}>{user?.name}</h3>
          <p style={styles.detail}>{user?.age} वर्ष • {user?.religion} • {user?.district || 'Bihar'}</p>
          <p style={styles.detail}>💼 {user?.profession || 'N/A'}</p>
          <span style={{ ...styles.statusBadge, ...statusColors[proposal.status] }}>
            {statusLabels[proposal.status]}
          </span>
        </div>
        <div style={styles.actions}>
          {showActions && proposal.status === 'pending' && (
            <>
              <button onClick={() => handleAction(proposal._id, 'accepted')} style={styles.acceptBtn}>✅ Accept</button>
              <button onClick={() => handleAction(proposal._id, 'rejected')} style={styles.rejectBtn}>❌ Reject</button>
            </>
          )}
          {proposal.status === 'accepted' && (
            <button onClick={() => navigate(`/chat/${tab === 'received' ? proposal.sender._id : proposal.receiver._id}`)} style={styles.chatBtn}>
              💬 Chat Karein
            </button>
          )}
          <button onClick={() => navigate(`/profile/${user?._id}`)} style={styles.viewBtn}>👁️ Profile</button>
        </div>
      </div>
    );
  };

  const statusColors = {
    pending: { background: '#fff3cd', color: '#856404' },
    accepted: { background: '#d4edda', color: '#155724' },
    rejected: { background: '#f8d7da', color: '#721c24' },
  };
  const statusLabels = { pending: '⏳ Pending', accepted: '✅ Accepted', rejected: '❌ Rejected' };

  if (loading) return <div className="loader" />;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Marriage Proposals</h1>

      <div style={styles.tabs}>
        <button onClick={() => setTab('received')} style={{ ...styles.tab, ...(tab === 'received' ? styles.activeTab : {}) }}>
          📩 Received ({received.length})
        </button>
        <button onClick={() => setTab('sent')} style={{ ...styles.tab, ...(tab === 'sent' ? styles.activeTab : {}) }}>
          📤 Sent ({sent.length})
        </button>
      </div>

      {tab === 'received' && (
        <div>
          {received.length === 0 ? (
            <div style={styles.empty}>
              <div style={{ fontSize: 60 }}>💌</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif" }}>Koi proposal nahi mila abhi</h3>
              <p>Profile complete karein aur accha match aaega!</p>
            </div>
          ) : (
            received.map(p => <ProfileMini key={p._id} user={p.sender} proposal={p} showActions={true} />)
          )}
        </div>
      )}

      {tab === 'sent' && (
        <div>
          {sent.length === 0 ? (
            <div style={styles.empty}>
              <div style={{ fontSize: 60 }}>📤</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif" }}>Koi proposal nahi bheja</h3>
              <p>Browse karein aur proposal bhejein!</p>
            </div>
          ) : (
            sent.map(p => <ProfileMini key={p._id} user={p.receiver} proposal={p} showActions={false} />)
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { maxWidth: 800, margin: '0 auto', padding: '32px 20px' },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 32, color: '#1a0a0a', marginBottom: 24 },
  tabs: { display: 'flex', gap: 0, marginBottom: 28, borderRadius: 10, overflow: 'hidden', border: '2px solid #e8d5c4' },
  tab: { flex: 1, padding: '12px', background: 'white', border: 'none', cursor: 'pointer', fontFamily: "'Hind', sans-serif", fontWeight: 600, fontSize: 15, color: '#7a5c52', transition: 'all 0.2s' },
  activeTab: { background: '#c0392b', color: 'white' },
  proposalCard: {
    background: 'white', borderRadius: 14, padding: '18px 20px',
    display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)', flexWrap: 'wrap',
  },
  avatar: { width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #f0e0d0', flexShrink: 0 },
  info: { flex: 1, minWidth: 180 },
  name: { fontFamily: "'Playfair Display', serif", fontSize: 20, color: '#1a0a0a', cursor: 'pointer', marginBottom: 6 },
  detail: { fontSize: 13, color: '#7a5c52', fontFamily: "'Hind', sans-serif", marginBottom: 4 },
  statusBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontFamily: "'Hind', sans-serif", fontWeight: 600 },
  actions: { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 130 },
  acceptBtn: { padding: '9px 14px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Hind', sans-serif", fontWeight: 600, fontSize: 13 },
  rejectBtn: { padding: '9px 14px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Hind', sans-serif", fontWeight: 600, fontSize: 13 },
  chatBtn: { padding: '9px 14px', background: '#2980b9', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Hind', sans-serif", fontWeight: 600, fontSize: 13 },
  viewBtn: { padding: '9px 14px', background: 'transparent', border: '2px solid #c0392b', color: '#c0392b', borderRadius: 8, cursor: 'pointer', fontFamily: "'Hind', sans-serif", fontWeight: 600, fontSize: 13 },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#7a5c52', fontFamily: "'Hind', sans-serif" },
};

export default Proposals;
