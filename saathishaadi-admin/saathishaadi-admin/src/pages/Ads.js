import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import { useAdminAuth } from '../context/AdminAuthContext';
import  adminAPI  from '../utils/api';
import toast from 'react-hot-toast';
import '../pages/Dashboard.css';
import './Ads.css';

const POSITIONS = ['top', 'sidebar', 'inline'];
const BG_COLORS = ['#1a5276', '#c0392b', '#27ae60', '#8e44ad', '#d4a017', '#2c3e50', '#1a8448'];
const emptyAd = { title: '', description: '', imageUrl: '', link: '#', position: 'sidebar', bgColor: '#1a5276', isActive: true };

export default function Ads() {
  const { token } = useAdminAuth();
  const api = adminAPI;

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAd, setEditAd] = useState(null);
  const [form, setForm] = useState(emptyAd);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Image state
  const [imageMode, setImageMode] = useState('url'); // 'url' | 'upload'
  const [uploading, setUploading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');
  const fileInputRef = useRef(null);

  const loadAds = async () => {
    setLoading(true);
    try { const data = await api.getAds(); setAds(data); }
    catch { toast.error('Ads load nahi hue'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAds(); }, []);

  const openNew = () => {
    setEditAd(null); setForm(emptyAd); setPreviewSrc(''); setImageMode('url'); setShowModal(true);
  };

  const openEdit = (ad) => {
    setEditAd(ad);
    setForm({ title: ad.title, description: ad.description, imageUrl: ad.imageUrl, link: ad.link, position: ad.position, bgColor: ad.bgColor, isActive: ad.isActive });
    setPreviewSrc(ad.imageUrl || '');
    setImageMode('url');
    setShowModal(true);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewSrc(URL.createObjectURL(file));
    setUploading(true);
    try {
      const result = await api.uploadAdImage(file);
      setForm(prev => ({ ...prev, imageUrl: result.imageUrl }));
      setPreviewSrc(result.imageUrl);
      toast.success('Photo upload ho gaya! ');
    } catch (err) {
      toast.error(err.message || 'Photo upload nahi hua');
      setPreviewSrc(''); setForm(prev => ({ ...prev, imageUrl: '' }));
    } finally { setUploading(false); }
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setForm(prev => ({ ...prev, imageUrl: val }));
    setPreviewSrc(val);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title required hai');
    if (uploading) return toast.error('Photo upload ho raha hai, thoda ruko...');
    setSaving(true);
    try {
      if (editAd) { await api.updateAd(editAd._id, form); toast.success('Ad update ho gaya'); }
      else { await api.createAd(form); toast.success('Naya ad create ho gaya'); }
      setShowModal(false); loadAds();
    } catch (err) { toast.error(err.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (ad) => {
    try { await api.updateAd(ad._id, { ...ad, isActive: !ad.isActive }); toast.success(ad.isActive ? 'Ad deactivate kiya' : 'Ad activate kiya'); loadAds(); }
    catch { toast.error('Error'); }
  };

  const handleDelete = async (id) => {
    try { await api.deleteAd(id); toast.success('Ad delete ho gaya'); setDeleteConfirm(null); loadAds(); }
    catch { toast.error('Error'); }
  };

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="page-content">
      <Header title="Advertisements" subtitle="Platform ads manage karein" />
      <div className="content-body">
        <div className="ad-stats-row">
          <div className="ad-stat-card"><div className="ad-stat-num">{ads.length}</div><div className="ad-stat-label">Total Ads</div></div>
          <div className="ad-stat-card" style={{ '--c': '#27ae60' }}><div className="ad-stat-num" style={{ color: '#27ae60' }}>{ads.filter(a => a.isActive).length}</div><div className="ad-stat-label">Active</div></div>
          <div className="ad-stat-card" style={{ '--c': '#e74c3c' }}><div className="ad-stat-num" style={{ color: '#e74c3c' }}>{ads.filter(a => !a.isActive).length}</div><div className="ad-stat-label">Inactive</div></div>
          <div className="ad-stat-card" style={{ '--c': '#d4a017' }}><div className="ad-stat-num" style={{ color: '#d4a017' }}>{ads.reduce((s, a) => s + (a.clicks || 0), 0)}</div><div className="ad-stat-label">Total Clicks</div></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={openNew}>+ Naya Ad Banao</button>
        </div>

        {loading ? (
          <div className="loader-wrap"><div className="spinner" /></div>
        ) : ads.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📢</div>
            <p>Abhi koi ad nahi hai. Pehla ad banao!</p>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={openNew}>+ Naya Ad</button>
          </div>
        ) : (
          <div className="ads-grid">
            {ads.map(ad => (
              <div key={ad._id} className={`ad-card ${!ad.isActive ? 'ad-inactive' : ''}`}>
                <div className="ad-preview" style={{ background: ad.bgColor }}>
                  {ad.imageUrl ? <img src={ad.imageUrl} alt={ad.title} className="ad-preview-img" onError={e => e.target.style.display = 'none'} /> : <div className="ad-preview-placeholder">📢</div>}
                  <div className="ad-preview-overlay">
                    <div className="ad-preview-title">{ad.title}</div>
                    {ad.description && <div className="ad-preview-desc">{ad.description}</div>}
                  </div>
                </div>
                <div className="ad-card-body">
                  <div className="ad-card-meta">
                    <span className={`badge ${ad.isActive ? 'badge-green' : 'badge-red'}`}>{ad.isActive ? '✅ Active' : '⏸️ Inactive'}</span>
                    <span className="badge badge-blue">{ad.position}</span>
                    <span className="badge badge-gold">👆 {ad.clicks || 0} clicks</span>
                  </div>
                  <div className="ad-card-link" title={ad.link}>{ad.link}</div>
                  <div className="ad-card-actions">
                    <button className="btn-outline btn-sm" onClick={() => openEdit(ad)}>✏️ Edit</button>
                    <button className={`btn-sm ${ad.isActive ? 'btn-danger' : 'btn-success'}`} onClick={() => handleToggle(ad)}>{ad.isActive ? '⏸️ Pause' : '▶️ Activate'}</button>
                    <button className="btn-danger btn-sm" onClick={() => setDeleteConfirm(ad)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editAd ? '✏️ Ad Edit Karo' : '📢 Naya Ad Banao'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Title *</label>
                <input className="input" placeholder="Ad ka title" value={form.title} onChange={f('title')} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="input" placeholder="Ad description (optional)" value={form.description} onChange={f('description')} rows={2} />
              </div>

              {/* ===== IMAGE SECTION ===== */}
              <div className="form-group">
                <label>Ad Image</label>

                {/* URL / Upload toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {[{ key: 'url', label: '🔗 URL Daalo' }, { key: 'upload', label: '📷 Photo Upload' }].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setImageMode(opt.key)}
                      style={{
                        padding: '7px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                        border: '2px solid',
                        borderColor: imageMode === opt.key ? '#c0392b' : '#ddd',
                        background: imageMode === opt.key ? '#c0392b' : 'transparent',
                        color: imageMode === opt.key ? '#fff' : '#888',
                        fontWeight: imageMode === opt.key ? 700 : 400,
                        transition: 'all 0.15s',
                      }}
                    >{opt.label}</button>
                  ))}
                </div>

                {/* URL input */}
                {imageMode === 'url' && (
                  <input className="input" placeholder="https://example.com/image.jpg" value={form.imageUrl} onChange={handleUrlChange} />
                )}

                {/* File upload */}
                {imageMode === 'upload' && (
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileSelect} />
                    <div
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed #ddd', borderRadius: 10, padding: '20px 16px',
                        textAlign: 'center', cursor: uploading ? 'wait' : 'pointer',
                        background: 'var(--bg-secondary, #f7f7f7)',
                      }}
                    >
                      {uploading ? (
                        <>
                          <div className="spinner" style={{ margin: '0 auto 8px', width: 26, height: 26 }} />
                          <div style={{ fontSize: 13, color: '#888' }}>Upload ho raha hai...</div>
                        </>
                      ) : previewSrc ? (
                        <div style={{ fontSize: 13, color: '#27ae60', fontWeight: 600 }}>✅ Upload ho gaya — dobara click karke badlo</div>
                      ) : (
                        <>
                          <div style={{ fontSize: 30, marginBottom: 6 }}>📷</div>
                          <div style={{ fontSize: 13, color: '#888' }}>Click karke photo choose karo</div>
                          <div style={{ fontSize: 11, color: '#bbb', marginTop: 3 }}>JPG, PNG, WebP — max 5MB</div>
                        </>
                      )}
                    </div>
                    {form.imageUrl && !uploading && (
                      <div style={{ marginTop: 6, fontSize: 11, color: '#999', wordBreak: 'break-all', padding: '5px 10px', background: '#f0f0f0', borderRadius: 6 }}>
                        🔗 {form.imageUrl}
                      </div>
                    )}
                  </div>
                )}

                {/* Preview + Remove */}
                {previewSrc && (
                  <div style={{ marginTop: 10, position: 'relative', display: 'inline-block' }}>
                    <img src={previewSrc} alt="Preview" style={{ maxWidth: '100%', maxHeight: 110, borderRadius: 8, objectFit: 'cover', border: '2px solid #ddd', display: 'block' }} onError={e => e.target.style.display = 'none'} />
                    <button type="button" onClick={() => { setPreviewSrc(''); setForm(prev => ({ ...prev, imageUrl: '' })); }}
                      style={{ position: 'absolute', top: -8, right: -8, background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 12, cursor: 'pointer' }}>✕</button>
                  </div>
                )}
              </div>
              {/* ===== END IMAGE SECTION ===== */}

              <div className="form-row">
                <div className="form-group">
                  <label>Link URL</label>
                  <input className="input" placeholder="https://..." value={form.link} onChange={f('link')} />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <select className="input" value={form.position} onChange={f('position')}>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select className="input" value={form.isActive} onChange={e => setForm(prev => ({ ...prev, isActive: e.target.value === 'true' }))}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Background Color</label>
                  <div className="color-picker">
                    {BG_COLORS.map(c => (
                      <div key={c} className={`color-swatch ${form.bgColor === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => setForm(prev => ({ ...prev, bgColor: c }))} />
                    ))}
                    <input type="color" value={form.bgColor} onChange={f('bgColor')} className="color-custom" title="Custom color" />
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="form-group">
                <label>Preview</label>
                <div className="ad-preview-mini" style={{ background: form.bgColor, overflow: 'hidden' }}>
                  {previewSrc && <img src={previewSrc} alt="" className="ad-preview-img" onError={e => e.target.style.display = 'none'} />}
                  <div className="ad-preview-overlay">
                    <div className="ad-preview-title">{form.title || 'Ad Title'}</div>
                    {form.description && <div className="ad-preview-desc">{form.description}</div>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn-primary" type="submit" disabled={saving || uploading}>
                  {uploading ? '📷 Upload ho raha...' : saving ? 'Save ho raha...' : '💾 Save'}
                </button>
                <button className="btn-outline" type="button" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>🗑️ Ad Delete?</h3>
            <p style={{ marginBottom: 20, color: 'var(--text-muted)' }}>"<strong>{deleteConfirm.title}</strong>" ko permanently delete karna chahte hain?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm._id)}>Haan, Delete</button>
              <button className="btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
