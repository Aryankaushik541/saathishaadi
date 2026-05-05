import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RELIGIONS, HINDU_CASTES, MUSLIM_CASTES, BIHAR_DISTRICTS, PROFESSIONS } from '../utils/constants';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Profile = () => {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const isOwn = !id || id === user?._id;
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    try {
      const uid = id || user?._id;
      const res = await api.get(`/users/${uid}`);
      setProfile(res.data);
      setForm(res.data);
    } catch { toast.error('Profile load nahi hua'); }
    setLoading(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
    if (photo) fd.append('photo', photo);
    try {
      const res = await api.put('/users/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(res.data);
      updateUser(res.data);
      setEditing(false);
      toast.success('Profile update ho gaya! ✅');
    } catch { toast.error('Update nahi hua'); }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) { setPhoto(file); setPhotoPreview(URL.createObjectURL(file)); }
  };

  if (loading) return <div className="loader" />;
  if (!profile) return <div style={{ textAlign: 'center', padding: 40 }}>Profile nahi mila</div>;

  const imgSrc = photoPreview || (profile.photo
    ? `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${profile.photo}`
    : `https://randomuser.me/api/portraits/${profile.gender === 'Male' ? 'men' : 'women'}/1.jpg`);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.photoBg} />
          <div style={styles.photoWrap}>
            <img src={imgSrc} alt={profile.name} style={styles.photo}
              onError={e => { e.target.src = `https://randomuser.me/api/portraits/${profile.gender === 'Male' ? 'men' : 'women'}/1.jpg`; }} />
            {editing && (
              <>
                <input type="file" id="editPhoto" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                <label htmlFor="editPhoto" style={styles.editPhotoBtn}>📷</label>
              </>
            )}
          </div>
          <div style={styles.headerInfo}>
            <h1 style={styles.name}>{profile.name}</h1>
            <div style={styles.tags}>
              <span style={styles.tag}>{profile.age} वर्ष</span>
              <span style={styles.tag}>{profile.religion}</span>
              {profile.caste && <span style={styles.tag}>{profile.caste}</span>}
              <span style={styles.tag}>📍 {profile.district || 'Bihar'}</span>
            </div>
            {!isOwn && (
              <div style={styles.actions}>
                <button onClick={() => navigate(`/chat/${profile._id}`)} style={styles.chatBtn}>💬 Message</button>
                <button onClick={() => navigate(`/call/${profile._id}?type=voice`)} style={styles.voiceBtn}>📞 Voice Call</button>
                <button onClick={() => navigate(`/call/${profile._id}?type=video`)} style={styles.videoBtn}>📹 Video Call</button>
              </div>
            )}
            {isOwn && !editing && (
              <button onClick={() => setEditing(true)} style={styles.editBtn}>✏️ Profile Edit Karein</button>
            )}
          </div>
        </div>

        {/* Details */}
        {!editing ? (
          <div style={styles.details}>
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Mere Baare Mein</h2>
              <p style={styles.bio}>{profile.bio || 'Koi bio nahi hai abhi.'}</p>
            </div>
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Basic Jaankari</h2>
              <div style={styles.infoGrid}>
                {[
                  ['🎂 Aayu', `${profile.age} Saal`],
                  ['👤 Ling', profile.gender === 'Male' ? 'Purush' : 'Mahila'],
                  ['🙏 Dharm', profile.religion],
                  ['🏛️ Jati', profile.caste || 'Bataya nahi'],
                  ['📍 Zila', profile.district || 'Bihar'],
                  ['💼 Peshaa', profile.profession || 'Bataya nahi'],
                  ['📧 Email', isOwn ? profile.email : '***@***.***'],
                ].map(([label, value]) => (
                  <div key={label} style={styles.infoItem}>
                    <span style={styles.infoLabel}>{label}</span>
                    <span style={styles.infoValue}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdate} style={styles.editForm}>
            <h2 style={styles.sectionTitle}>Profile Update Karein</h2>
            <div style={styles.grid2}>
              <div>
                <label style={styles.label}>Naam</label>
                <input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>Aayu</label>
                <input type="number" min={18} max={60} value={form.age || ''} onChange={e => setForm({...form, age: e.target.value})} style={styles.input} />
              </div>
            </div>
            <div style={styles.grid2}>
              <div>
                <label style={styles.label}>Dharm</label>
                <select value={form.religion || ''} onChange={e => setForm({...form, religion: e.target.value, caste: ''})} style={styles.input}>
                  {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={styles.label}>Jati</label>
                <select value={form.caste || ''} onChange={e => setForm({...form, caste: e.target.value})} style={styles.input}>
                  <option value="">Select</option>
                  {(form.religion === 'Muslim' ? MUSLIM_CASTES : HINDU_CASTES).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={styles.grid2}>
              <div>
                <label style={styles.label}>Zila</label>
                <select value={form.district || ''} onChange={e => setForm({...form, district: e.target.value})} style={styles.input}>
                  <option value="">Select</option>
                  {BIHAR_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={styles.label}>Peshaa</label>
                <select value={form.profession || ''} onChange={e => setForm({...form, profession: e.target.value})} style={styles.input}>
                  <option value="">Select</option>
                  {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={styles.label}>Bio</label>
              <textarea value={form.bio || ''} onChange={e => setForm({...form, bio: e.target.value})} rows={4} style={{ ...styles.input, resize: 'vertical' }} />
            </div>
            <div style={styles.editActions}>
              <button type="submit" style={styles.saveBtn}>✅ Save Karein</button>
              <button type="button" onClick={() => { setEditing(false); setPhotoPreview(''); }} style={styles.cancelBtn}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: { maxWidth: 800, margin: '0 auto', padding: '24px 20px' },
  card: { background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' },
  header: { position: 'relative', padding: '80px 24px 24px' },
  photoBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 100, background: 'linear-gradient(135deg, #1a0a0a, #2d1010)' },
  photoWrap: { position: 'relative', display: 'inline-block', marginBottom: 16 },
  photo: { width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '5px solid white', display: 'block', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' },
  editPhotoBtn: { position: 'absolute', bottom: 4, right: 4, background: '#c0392b', color: 'white', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 },
  headerInfo: {},
  name: { fontFamily: "'Playfair Display', serif", fontSize: 28, color: '#1a0a0a', marginBottom: 10 },
  tags: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  tag: { background: '#f5ece0', color: '#c0392b', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontFamily: "'Hind', sans-serif", fontWeight: 600, border: '1px solid #e8d5c4' },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  chatBtn: { padding: '10px 18px', background: '#2980b9', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Hind', sans-serif", fontWeight: 600 },
  voiceBtn: { padding: '10px 18px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Hind', sans-serif", fontWeight: 600 },
  videoBtn: { padding: '10px 18px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Hind', sans-serif", fontWeight: 600 },
  editBtn: { padding: '10px 22px', background: 'transparent', border: '2px solid #c0392b', color: '#c0392b', borderRadius: 8, cursor: 'pointer', fontFamily: "'Hind', sans-serif", fontWeight: 600 },
  details: { padding: '0 24px 28px' },
  section: { marginBottom: 28, borderTop: '1px solid #f0e0d0', paddingTop: 20 },
  sectionTitle: { fontFamily: "'Playfair Display', serif", fontSize: 20, color: '#1a0a0a', marginBottom: 14 },
  bio: { color: '#5a4040', fontFamily: "'Hind', sans-serif", lineHeight: 1.8, fontSize: 15 },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 },
  infoItem: { display: 'flex', flexDirection: 'column', background: '#fdf6ec', padding: '12px 14px', borderRadius: 10 },
  infoLabel: { fontSize: 12, color: '#7a5c52', fontFamily: "'Hind', sans-serif", marginBottom: 4 },
  infoValue: { fontSize: 15, color: '#1a0a0a', fontFamily: "'Hind', sans-serif", fontWeight: 600 },
  editForm: { padding: '0 24px 28px', display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid #f0e0d0', marginTop: 0 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#2c1810', marginBottom: 5, fontFamily: "'Hind', sans-serif" },
  input: { width: '100%', padding: '11px 14px', border: '2px solid #e8d5c4', borderRadius: 8, fontFamily: "'Hind', sans-serif", fontSize: 14 },
  editActions: { display: 'flex', gap: 12 },
  saveBtn: { padding: '12px 24px', background: 'linear-gradient(135deg, #c0392b, #96281b)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Hind', sans-serif", fontWeight: 700 },
  cancelBtn: { padding: '12px 24px', background: 'transparent', border: '2px solid #e8d5c4', color: '#7a5c52', borderRadius: 8, cursor: 'pointer', fontFamily: "'Hind', sans-serif" },
};

export default Profile;
