import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminAPI } from '../utils/api';
import toast from 'react-hot-toast';
import './Dashboard.css';

const defaultForm = {
  slug: '',
  title: '',
  subtitle: '',
  content: '',
  isActive: true,
};

export default function Pages() {
  const { token } = useAdminAuth();
  const api = adminAPI(token);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const loadPages = async () => {
    setLoading(true);
    try {
      setPages(await api.getPages());
    } catch {
      toast.error('Pages load nahi hue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPages(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(defaultForm);
  };

  const openEdit = (page) => {
    setEditing(page);
    setForm({
      slug: page.slug || '',
      title: page.title || '',
      subtitle: page.subtitle || '',
      content: page.content || '',
      isActive: page.isActive !== false,
    });
  };

  const savePage = async (e) => {
    e.preventDefault();
    if (!form.slug.trim() || !form.title.trim() || !form.content.trim()) {
      return toast.error('Slug, title aur content required hai');
    }

    setSaving(true);
    try {
      if (editing) {
        await api.updatePage(editing._id, form);
        toast.success('Page update ho gaya');
      } else {
        await api.createPage(form);
        toast.success('Page create ho gaya');
      }
      openNew();
      loadPages();
    } catch (err) {
      toast.error(err.message || 'Page save nahi hua');
    } finally {
      setSaving(false);
    }
  };

  const deletePage = async (page) => {
    if (!window.confirm(`${page.title} delete karna hai?`)) return;
    try {
      await api.deletePage(page._id);
      toast.success('Page delete ho gaya');
      if (editing?._id === page._id) openNew();
      loadPages();
    } catch {
      toast.error('Page delete nahi hua');
    }
  };

  const updateField = (key) => (e) => {
    const value = key === 'isActive' ? e.target.value === 'true' : e.target.value;
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="page-content">
      <Header title="Pages" subtitle="Website ke footer aur information pages manage karein" />

      <div className="content-body">
        <div className="charts-row">
          <div className="card chart-card" style={{ height: 'auto' }}>
            <h3 className="chart-title">{editing ? 'Page Edit Karo' : 'Naya Page Banao'}</h3>
            <form onSubmit={savePage}>
              <div className="form-group">
                <label>Slug *</label>
                <input className="input" value={form.slug} onChange={updateField('slug')} placeholder="privacy-policy" />
              </div>
              <div className="form-group">
                <label>Title *</label>
                <input className="input" value={form.title} onChange={updateField('title')} placeholder="Privacy Policy" />
              </div>
              <div className="form-group">
                <label>Subtitle</label>
                <input className="input" value={form.subtitle} onChange={updateField('subtitle')} placeholder="Short page intro" />
              </div>
              <div className="form-group">
                <label>Content *</label>
                <textarea className="input" rows={9} value={form.content} onChange={updateField('content')} placeholder="Har paragraph ko new line me likhein" />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="input" value={form.isActive} onChange={updateField('isActive')}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                {editing && <button type="button" className="btn-outline" onClick={openNew}>Cancel</button>}
                <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Page'}</button>
              </div>
            </form>
          </div>

          <div className="card chart-card" style={{ height: 'auto' }}>
            <h3 className="chart-title">All Pages</h3>
            {loading ? (
              <div className="loader-wrap"><div className="spinner" /></div>
            ) : pages.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Abhi koi custom page nahi hai.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pages.map(page => (
                  <div key={page._id} className="summary-item" style={{ alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <span className="summary-label">{page.slug}</span>
                      <span className="summary-val" style={{ fontSize: 16 }}>{page.title}</span>
                      <div style={{ marginTop: 6 }}>
                        <span className={`badge ${page.isActive ? 'badge-green' : 'badge-red'}`}>
                          {page.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-outline btn-sm" onClick={() => openEdit(page)}>Edit</button>
                      <button className="btn-danger btn-sm" onClick={() => deletePage(page)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
