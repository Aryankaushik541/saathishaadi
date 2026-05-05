import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminAPI } from '../utils/api';
import toast from 'react-hot-toast';
import './Dashboard.css';
import './Users.css';

const STATUS_COLORS = {
  pending: 'badge-gold',
  accepted: 'badge-green',
  rejected: 'badge-red',
};

const STATUS_ICONS = {
  pending: '⏳',
  accepted: '✅',
  rejected: '❌',
};

export default function Proposals() {
  const { token } = useAdminAuth();
  const api = adminAPI(token);

  const [proposals, setProposals] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, rejected: 0 });

  const loadProposals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', 20);
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const data = await api.getProposals('?' + params.toString());
      setProposals(data.proposals);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error('Proposals load nahi hue');
    } finally {
      setLoading(false);
    }
  }, [token, page, status, search]);

  const loadStats = useCallback(async () => {
    try {
      const [all, pend, acc, rej] = await Promise.all([
        api.getProposals('?limit=1'),
        api.getProposals('?status=pending&limit=1'),
        api.getProposals('?status=accepted&limit=1'),
        api.getProposals('?status=rejected&limit=1'),
      ]);
      setStats({
        total: all.total,
        pending: pend.total,
        accepted: acc.total,
        rejected: rej.total,
      });
    } catch {}
  }, [token]);

  useEffect(() => {
    loadProposals();
    loadStats();
  }, [loadProposals, loadStats]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateProposalStatus(id, newStatus);
      toast.success(`Proposal ${newStatus} kar diya`);
      setStatusConfirm(null);
      setSelectedProposal(null);
      loadProposals();
      loadStats();
    } catch { toast.error('Status update error'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteProposal(id);
      toast.success('Proposal delete kar diya');
      setDeleteConfirm(null);
      setSelectedProposal(null);
      loadProposals();
      loadStats();
    } catch { toast.error('Delete error'); }
  };

  return (
    <div className="page-content">
      <Header title="Proposals Management" subtitle={`${total} total proposals`} />

      <div className="content-body">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total', value: stats.total, color: '#c0392b', icon: '💌' },
            { label: 'Pending', value: stats.pending, color: '#d4a017', icon: '⏳' },
            { label: 'Accepted', value: stats.accepted, color: '#27ae60', icon: '✅' },
            { label: 'Rejected', value: stats.rejected, color: '#e74c3c', icon: '❌' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ '--accent': s.color }}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card filters-bar">
          <div className="filters-row">
            <input
              className="input" placeholder="🔍 Sender ya Receiver name search..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ maxWidth: 280 }}
            />
            <select className="input" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="accepted">✅ Accepted</option>
              <option value="rejected">❌ Rejected</option>
            </select>
            <button className="btn-outline" onClick={() => { setSearch(''); setStatus(''); setPage(1); }}>Reset</button>
            <button className="btn-primary btn-sm" onClick={() => { loadProposals(); loadStats(); }}>🔄 Refresh</button>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-header-bar">
            <span>{total} Proposals</span>
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
                    <th>Status</th>
                    <th>Message</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Koi proposal nahi mila</td></tr>
                  ) : proposals.map((p, i) => (
                    <tr key={p._id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page - 1) * 20 + i + 1}</td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-placeholder" style={{ background: '#3498db' }}>
                            {p.sender?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="user-name">{p.sender?.name || 'Deleted User'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.sender?.gender || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-placeholder" style={{ background: '#e91e8c' }}>
                            {p.receiver?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="user-name">{p.receiver?.name || 'Deleted User'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.receiver?.gender || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_COLORS[p.status]}`}>
                          {STATUS_ICONS[p.status]} {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-muted)' }}>
                        {p.message || '-'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(p.createdAt).toLocaleDateString('hi-IN')}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-outline btn-sm" onClick={() => setSelectedProposal(p)} title="View">👁️</button>
                          {p.status !== 'accepted' && (
                            <button className="btn-success btn-sm" onClick={() => setStatusConfirm({ proposal: p, newStatus: 'accepted' })}>✅</button>
                          )}
                          {p.status !== 'rejected' && (
                            <button className="btn-danger btn-sm" onClick={() => setStatusConfirm({ proposal: p, newStatus: 'rejected' })}>❌</button>
                          )}
                          {p.status !== 'pending' && (
                            <button className="btn-outline btn-sm" onClick={() => setStatusConfirm({ proposal: p, newStatus: 'pending' })}>⏳</button>
                          )}
                          <button className="btn-danger btn-sm" onClick={() => setDeleteConfirm(p)} title="Delete">🗑️</button>
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

      {/* Detail Modal */}
      {selectedProposal && (
        <div className="modal-overlay" onClick={() => setSelectedProposal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>💌 Proposal Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', margin: '16px 0' }}>
              <div style={{ textAlign: 'center', padding: 16, background: 'var(--cream)', borderRadius: 12 }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#3498db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20, margin: '0 auto 8px' }}>
                  {selectedProposal.sender?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ fontWeight: 600 }}>{selectedProposal.sender?.name || 'Deleted User'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedProposal.sender?.gender} • {selectedProposal.sender?.religion}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedProposal.sender?.district}</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 24 }}>💌</div>
              <div style={{ textAlign: 'center', padding: 16, background: 'var(--cream)', borderRadius: 12 }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#e91e8c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20, margin: '0 auto 8px' }}>
                  {selectedProposal.receiver?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ fontWeight: 600 }}>{selectedProposal.receiver?.name || 'Deleted User'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedProposal.receiver?.gender} • {selectedProposal.receiver?.religion}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedProposal.receiver?.district}</div>
              </div>
            </div>

            <div className="detail-list">
              {[
                ['Status', <span className={`badge ${STATUS_COLORS[selectedProposal.status]}`}>{STATUS_ICONS[selectedProposal.status]} {selectedProposal.status}</span>],
                ['Bheja gaya', new Date(selectedProposal.createdAt).toLocaleString('hi-IN')],
              ].map(([k, v]) => (
                <div key={k} className="detail-row">
                  <span className="detail-key">{k}</span>
                  <span className="detail-val">{v}</span>
                </div>
              ))}
            </div>

            {selectedProposal.message && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--cream)', borderRadius: 10, fontSize: 14, fontStyle: 'italic' }}>
                "{selectedProposal.message}"
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
              {selectedProposal.status !== 'accepted' && (
                <button className="btn-success btn-sm" onClick={() => handleStatusChange(selectedProposal._id, 'accepted')}>✅ Accept</button>
              )}
              {selectedProposal.status !== 'rejected' && (
                <button className="btn-danger btn-sm" onClick={() => handleStatusChange(selectedProposal._id, 'rejected')}>❌ Reject</button>
              )}
              {selectedProposal.status !== 'pending' && (
                <button className="btn-outline btn-sm" onClick={() => handleStatusChange(selectedProposal._id, 'pending')}>⏳ Pending</button>
              )}
              <button className="btn-danger btn-sm" onClick={() => { setDeleteConfirm(selectedProposal); setSelectedProposal(null); }}>🗑️ Delete</button>
              <button className="btn-outline" onClick={() => setSelectedProposal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirm */}
      {statusConfirm && (
        <div className="modal-overlay" onClick={() => setStatusConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <h3>🔄 Status Change?</h3>
            <p style={{ marginBottom: 20, color: 'var(--text-muted)' }}>
              <strong>{statusConfirm.proposal.sender?.name}</strong> → <strong>{statusConfirm.proposal.receiver?.name}</strong> ke proposal ko <strong>{statusConfirm.newStatus}</strong> karna chahte hain?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={() => handleStatusChange(statusConfirm.proposal._id, statusConfirm.newStatus)}>Haan, Change Karo</button>
              <button className="btn-outline" onClick={() => setStatusConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>🗑️ Proposal Delete?</h3>
            <p style={{ marginBottom: 20, color: 'var(--text-muted)' }}>
              <strong>{deleteConfirm.sender?.name}</strong> se <strong>{deleteConfirm.receiver?.name}</strong> ko bheja proposal permanently delete karna chahte hain?
            </p>
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
