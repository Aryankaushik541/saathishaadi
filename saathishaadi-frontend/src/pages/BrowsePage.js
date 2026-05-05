import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { DUMMY_PROFILES, RELIGIONS, BIHAR_DISTRICTS } from '../utils/dummyData';
import ProfileCard from '../components/ProfileCard';
import { SidebarAds } from '../components/AdBanner';
import './BrowsePage.css';

const BrowsePage = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentProposals, setSentProposals] = useState({});
  const [filters, setFilters] = useState({
    gender: user?.gender === 'Male' ? 'Female' : 'Male',
    religion: '',
    minAge: 18,
    maxAge: 50,
    location: ''
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/users/browse', { params: filters });
      setProfiles(res.data.users || []);
    } catch (err) {
      // Use dummy data on error
      setProfiles(DUMMY_PROFILES);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => fetchProfiles();

  const handleReset = () => {
    setFilters({
      gender: user?.gender === 'Male' ? 'Female' : 'Male',
      religion: '', minAge: 18, maxAge: 50, location: ''
    });
  };

  const handleSendProposal = async (targetId) => {
    try {
      await axios.post('/proposals/send', { toUserId: targetId });
      setSentProposals(p => ({...p, [targetId]: true}));
      toast.success('💌 Proposal bheja gaya!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Proposal nahi bheja ja saka');
    }
  };

  const displayProfiles = profiles.length > 0 ? profiles : DUMMY_PROFILES;
  const filteredDummy = displayProfiles.filter(p => {
    if (filters.gender && p.gender !== filters.gender) return false;
    if (filters.religion && p.religion !== filters.religion) return false;
    return true;
  });

  return (
    <div className="browse-page">
      <div className="browse-header">
        <div className="page-container">
          <h1>🔍 Profiles Dhundhe</h1>
          <p>Bihar ke verified profiles mein se apna perfect match khoje</p>
        </div>
      </div>

      <div className="browse-layout page-container">
        {/* Filter Panel */}
        <aside className="filter-panel">
          <div className="filter-box">
            <h3>🎯 Filter Karein</h3>
            
            <div className="filter-group">
              <label>Kaun Chahiye?</label>
              <div className="radio-group">
                {['Male', 'Female', ''].map((g) => (
                  <label key={g} className="radio-label">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={filters.gender === g}
                      onChange={e => setFilters(p => ({...p, gender: e.target.value}))}
                    />
                    {g === '' ? 'Sabhi' : g === 'Male' ? '♂ Ladke' : '♀ Ladkiyan'}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>Dharm</label>
              <select
                className="input-field"
                value={filters.religion}
                onChange={e => setFilters(p => ({...p, religion: e.target.value}))}
              >
                <option value="">Sabhi Dharm</option>
                {RELIGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Jila (District)</label>
              <select
                className="input-field"
                value={filters.location}
                onChange={e => setFilters(p => ({...p, location: e.target.value}))}
              >
                <option value="">Sabhi Jile</option>
                {BIHAR_DISTRICTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Age Range: {filters.minAge} - {filters.maxAge} years</label>
              <div className="range-row">
                <input
                  type="range" min={18} max={60}
                  value={filters.minAge}
                  onChange={e => setFilters(p => ({...p, minAge: +e.target.value}))}
                  className="range-input"
                />
                <input
                  type="range" min={18} max={60}
                  value={filters.maxAge}
                  onChange={e => setFilters(p => ({...p, maxAge: +e.target.value}))}
                  className="range-input"
                />
              </div>
            </div>

            <button className="btn-primary filter-btn" onClick={handleFilter}>
              🔍 Filter Karein
            </button>
            <button className="btn-outline filter-btn" onClick={handleReset}>
              ↺ Reset
            </button>
          </div>

          <SidebarAds />
        </aside>

        {/* Profiles Grid */}
        <main className="browse-main">
          <div className="browse-toolbar">
            <span className="result-count">
              {filteredDummy.length} profiles mile
            </span>
            <select className="input-field sort-select">
              <option>Newest First</option>
              <option>Age: Young to Old</option>
              <option>Age: Old to Young</option>
            </select>
          </div>

          {loading ? (
            <div className="browse-loading">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="profile-card-skeleton">
                  <div className="skel-img"></div>
                  <div className="skel-body">
                    <div className="skel-line"></div>
                    <div className="skel-line short"></div>
                    <div className="skel-line"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="browse-grid">
              {filteredDummy.map((profile, idx) => (
                <React.Fragment key={profile._id}>
                  <ProfileCard
                    profile={profile}
                    onSendProposal={handleSendProposal}
                    proposalSent={sentProposals[profile._id]}
                  />
                  {/* Inline ad every 6 profiles */}
                  {(idx + 1) % 6 === 0 && idx !== filteredDummy.length - 1 && (
                    <div className="browse-ad-slot">
                      <span className="ad-label">Advertisement</span>
                      <div className="browse-ad-content">
                        🏛️ <strong>Shree Ram Marriage Hall, Patna</strong>
                        <br/><small>A/C Hall • Catering • Decoration — ☎ 9876543210</small>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {filteredDummy.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-icon">😔</div>
              <h3>Koi Profile Nahi Mila</h3>
              <p>Filter change karein ya baad mein dobara try karein</p>
              <button className="btn-primary" onClick={handleReset}>Filter Reset Karein</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default BrowsePage;
