import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminAPI } from '../utils/api';
import toast from 'react-hot-toast';
import './Dashboard.css';
import './Users.css';

export default function Messages() {
  const { token } = useAdminAuth();
  const api = adminAPI(token);

  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', 30);
      if (search) params.set('search', search);
      const data = await api.getMessages('?' + params.toString());
      setMessages(data.messages);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error('Messages load nahi hue');
    } finally {
      setLoading(false);
    }
  }, [token, page, search]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const handleDelete = async (id) => {
    try {
      await api.deleteMessage(id);
      toast.success('Message delete kar diya');
      setDeleteConfirm(null);
      setSelectedMsg(null);
      loadMessages();
    } catch { toast.error('Delete error'); }
  };

  const truncate = (str, n = 60) => str?.length > n ? str.slice(0, n) + '...' : str;

  return (
    <div className="page-content">
      <Header title="Messages Management" subtitle={`${total} total messages`} />

      <div className="content-body">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="stat-card" style={{ '--accent': '#8e44ad' }}>
            <div className="stat-icon">💬</div>
            <div className="stat-value">{total}</div>
            <div className="stat-label">Total Messages</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card filters-bar">
          <div className="filters-row">
            <input
              className="input" placeholder="🔍 Sender, Receiver ya message search..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ maxWidth: 320 }}
            />
            <button className="btn-outline" onClick={() => { setSearch(''); setPage(1); }}>Reset</button>
            <button className="btn-primary btn-sm" onClick={loadMessages}>🔄 Refresh</button>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-header-bar">
            <span>{total} Messages</span>
          </div>
          <div className="table-wrap">
            {loading ? (
              <div className="loader-wrap"><div className="spinner" /></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Sender</th>
                    <th>Receiver</th>
                    <th>Message</th>
                    <th>Date & Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Koi message nahi mila</td></tr>
                  ) : messages.map((m, i) => (
                    <tr key={m._id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page - 1) * 30 + i + 1}</td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-placeholder" style={{ background: '#3498db' }}>
                            {m.sender?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="user-name">{m.sender?.name || 'Deleted User'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.sender?.gender}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-placeholder" style={{ background: '#e91e8c' }}>
                            {m.receiver?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="user-name">{m.receiver?.name || 'Deleted User'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.receiver?.gender}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ maxWidth: 250 }}>
                        <div
                          style={{ fontSize: 13, color: '#4a3728', cursor: 'pointer', padding: '4px 0' }}
                          onClick={() => setSelectedMsg(m)}
                          title="Click to see full message"
                        >
                          {truncate(m.text)}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(m.createdAt).toLocaleString('hi-IN')}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-outline btn-sm" onClick={() => setSelectedMsg(m)} title="View">👁️</button>
                          <button className="btn-danger btn-sm" onClick={() => setDeleteConfirm(m)} title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="table-footer">
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  );
                })}
                <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
            </div>
          )}
        </div>
      </div>

      {/* Message Detail Modal */}
      {selectedMsg && (
        <div className="modal-overlay" onClick={() => setSelectedMsg(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h3>💬 Message Details</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0', padding: 16, background: 'var(--cream)', borderRadius: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#3498db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, margin: '0 auto 4px' }}>
                  {selectedMsg.sender?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{selectedMsg.sender?.name || 'Deleted'}</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 20 }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e91e8c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, margin: '0 auto 4px' }}>
                  {selectedMsg.receiver?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{selectedMsg.receiver?.name || 'Deleted'}</div>
              </div>
            </div>

            <div style={{ padding: '16px', background: '#f8f4f0', borderRadius: 12, marginBottom: 16, fontSize: 15, lineHeight: 1.6, wordBreak: 'break-word', borderLeft: '4px solid var(--primary)' }}>
              {selectedMsg.text}
            </div>

            <div className="detail-list">
              {[
                ['Bheja gaya', new Date(selectedMsg.createdAt).toLocaleString('hi-IN')],
                ['Message ID', <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{selectedMsg._id}</span>],
              ].map(([k, v]) => (
                <div key={k} className="detail-row">
                  <span className="detail-key">{k}</span>
                  <span className="detail-val">{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn-danger" onClick={() => { setDeleteConfirm(selectedMsg); setSelectedMsg(null); }}>🗑️ Delete Message</button>
              <button className="btn-outline" onClick={() => setSelectedMsg(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>🗑️ Message Delete?</h3>
            <p style={{ marginBottom: 12, color: 'var(--text-muted)' }}>
              <strong>{deleteConfirm.sender?.name}</strong> ka yeh message permanently delete karna chahte hain?
            </p>
            <div style={{ padding: '10px 14px', background: 'var(--cream)', borderRadius: 8, fontSize: 13, marginBottom: 20, fontStyle: 'italic' }}>
              "{truncate(deleteConfirm.text, 100)}"
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm._id)}>🗑️ Haan, Delete</button>
              <button className="btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
