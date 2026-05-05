import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { DUMMY_PROFILES } from '../utils/dummyData';
import './ProposalsPage.css';

const API = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const ProposalCard = ({ proposal, type, onAction }) => {
  const person = type === 'received' ? proposal.fromUser : proposal.toUser;
  const photoUrl = person?.photo
    ? (person.photo.startsWith('http') ? person.photo : `${API}${person.photo}`)
    : 'https://randomuser.me/api/portraits/lego/1.jpg';

  return (
    <div className={`proposal-card status-${proposal.status}`}>
      <img src={photoUrl} alt={person?.name} className="proposal-img" />
      <div className="proposal-info">
        <div className="proposal-name">{person?.name || 'Unknown'}</div>
        <div className="proposal-meta">
          🎂 {person?.age} yrs • 📍 {person?.location || 'Bihar'} • {person?.religion}
        </div>
        {person?.bio && <p className="proposal-bio">{person.bio.slice(0, 80)}...</p>}
        <div className={`proposal-status status-${proposal.status}`}>
          {proposal.status === 'pending' && '⏳ Pending'}
          {proposal.status === 'accepted' && '✅ Accepted'}
          {proposal.status === 'rejected' && '❌ Rejected'}
        </div>
      </div>
      <div className="proposal-actions">
        {type === 'received' && proposal.status === 'pending' && (
          <>
            <button className="pa-btn accept" onClick={() => onAction(proposal._id, 'accepted')}>
              ✅ Accept
            </button>
            <button className="pa-btn reject" onClick={() => onAction(proposal._id, 'rejected')}>
              ❌ Reject
            </button>
          </>
        )}
        {proposal.status === 'accepted' && (
          <Link to={`/chat/${type === 'received' ? proposal.fromUser?._id : proposal.toUser?._id}`} className="pa-btn chat">
            💬 Chat Karein
          </Link>
        )}
        <Link to={`/profile/${person?._id}`} className="pa-btn view">👁 Profile</Link>
      </div>
    </div>
  );
};

const DUMMY_PROPOSALS_RECEIVED = [
  { _id: 'p1', fromUser: DUMMY_PROFILES[1], status: 'pending' },
  { _id: 'p2', fromUser: DUMMY_PROFILES[3], status: 'accepted' },
  { _id: 'p3', fromUser: DUMMY_PROFILES[5], status: 'rejected' },
];

const DUMMY_PROPOSALS_SENT = [
  { _id: 'p4', toUser: DUMMY_PROFILES[0], status: 'pending' },
  { _id: 'p5', toUser: DUMMY_PROFILES[4], status: 'accepted' },
];

const ProposalsPage = () => {
  const [tab, setTab] = useState('received');
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const [recRes, sentRes] = await Promise.all([
        axios.get('/proposals/received'),
        axios.get('/proposals/sent')
      ]);
      setReceived(recRes.data.proposals || []);
      setSent(sentRes.data.proposals || []);
    } catch (err) {
      setReceived(DUMMY_PROPOSALS_RECEIVED);
      setSent(DUMMY_PROPOSALS_SENT);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (proposalId, action) => {
    try {
      await axios.put(`/proposals/${proposalId}`, { status: action });
      toast.success(action === 'accepted' ? '✅ Proposal accept kar liya!' : '❌ Proposal reject kar diya');
      fetchProposals();
    } catch (err) {
      toast.error('Action fail ho gaya');
    }
  };

  const displayReceived = received.length > 0 ? received : DUMMY_PROPOSALS_RECEIVED;
  const displaySent = sent.length > 0 ? sent : DUMMY_PROPOSALS_SENT;
  const current = tab === 'received' ? displayReceived : displaySent;

  return (
    <div className="proposals-page page-container">
      <div className="proposals-header">
        <h1>💌 Proposals</h1>
        <p>Aaye aur bheje gaye rishton ka record</p>
      </div>

      {/* Stats Bar */}
      <div className="proposal-stats">
        <div className="pstat">
          <span className="pstat-num">{displayReceived.length}</span>
          <span className="pstat-label">Proposals Mile</span>
        </div>
        <div className="pstat">
          <span className="pstat-num" style={{color:'var(--success)'}}>
            {displayReceived.filter(p => p.status === 'accepted').length}
          </span>
          <span className="pstat-label">Accept Hue</span>
        </div>
        <div className="pstat">
          <span className="pstat-num" style={{color:'var(--gold)'}}>
            {displayReceived.filter(p => p.status === 'pending').length}
          </span>
          <span className="pstat-label">Pending</span>
        </div>
        <div className="pstat">
          <span className="pstat-num" style={{color:'var(--primary)'}}>
            {displaySent.length}
          </span>
          <span className="pstat-label">Bheje Gaye</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="proposal-tabs">
        <button
          className={`ptab ${tab === 'received' ? 'active' : ''}`}
          onClick={() => setTab('received')}
        >
          📨 Mile Proposals ({displayReceived.length})
        </button>
        <button
          className={`ptab ${tab === 'sent' ? 'active' : ''}`}
          onClick={() => setTab('sent')}
        >
          📤 Bheje Proposals ({displaySent.length})
        </button>
      </div>

      {/* Proposal Cards */}
      {loading ? (
        <div className="proposals-loading">Loading...</div>
      ) : current.length === 0 ? (
        <div className="proposals-empty">
          <div style={{fontSize:'56px',marginBottom:16}}>💌</div>
          <h3>{tab === 'received' ? 'Abhi koi proposal nahi aaya' : 'Abhi koi proposal nahi bheja'}</h3>
          <p>{tab === 'received' ? 'Profile complete karein to jyada proposals ayenge!' : 'Browse karein aur pasand ke profiles ko propose karein'}</p>
          <Link to="/browse" className="btn-primary" style={{display:'inline-block',marginTop:16,textDecoration:'none'}}>
            Profiles Dhundhe
          </Link>
        </div>
      ) : (
        <div className="proposals-list">
          {current.map(p => (
            <ProposalCard
              key={p._id}
              proposal={p}
              type={tab}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProposalsPage;
