import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function OTPLogs() {
  const [otps, setOtps]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [stats, setStats]   = useState([]);
  const [topIPs, setTopIPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [filters, setFilters] = useState({ used: '', email: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (filters.used !== '') params.used = filters.used;
      if (filters.email) params.email = filters.email;
      const data = await api.getOTPLogs(params);
      setOtps(data.otps || []);
      setTotal(data.total || 0);
      setStats(data.stats || []);
      setTopIPs(data.topIPs || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const handleCleanup = async () => {
    if (!window.confirm('Sare used/expired OTPs delete karein?')) return;
    try {
      const res = await api.cleanupOTPs();
      toast.success(res.message);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteOTP(id);
      toast.success('OTP invalidate ho gaya');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const S = styles;
  const totalUsed    = stats.find(s => s._id === true)?.count  || 0;
  const totalUnused  = stats.find(s => s._id === false)?.count || 0;
  const avgAttempts  = stats.find(s => s._id === false)?.avgAttempts || 0;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🔢 OTP Logs</h1>
          <p style={S.subtitle}>Kaun sa OTP kab, kahan se bheja gaya — poora record</p>
        </div>
        <button style={S.cleanBtn} onClick={handleCleanup}>🧹 Cleanup Used/Expired</button>
      </div>

      {/* Stats */}
      <div style={S.statsRow}>
        <div style={S.statCard}><div style={S.statNum}>{total}</div><div style={S.statLabel}>Total OTPs</div></div>
        <div style={{ ...S.statCard, borderColor: '#27ae60' }}><div style={{ ...S.statNum, color: '#27ae60' }}>{totalUsed}</div><div style={S.statLabel}>Used (Success)</div></div>
        <div style={{ ...S.statCard, borderColor: '#f39c12' }}><div style={{ ...S.statNum, color: '#f39c12' }}>{totalUnused}</div><div style={S.statLabel}>Pending/Unused</div></div>
        <div style={S.statCard}><div style={S.statNum}>{avgAttempts.toFixed(1)}</div><div style={S.statLabel}>Avg Attempts</div></div>
      </div>

      {/* Top IPs */}
      {topIPs.length > 0 && (
        <div style={S.card}>
          <h3 style={S.cardTitle}>🔝 OTP Request karne wale Top IPs</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {topIPs.map(item => (
              <div key={item._id} style={S.ipChip}>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item._id}</span>
                <span style={S.ipCount}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={S.filterRow}>
        <input
          style={S.filterInput}
          placeholder="📧 Email se filter..."
          value={filters.email}
          onChange={e => { setFilters(f => ({ ...f, email: e.target.value })); setPage(1); }}
        />
        <select
          style={S.filterInput}
          value={filters.used}
          onChange={e => { setFilters(f => ({ ...f, used: e.target.value })); setPage(1); }}
        >
          <option value="">All OTPs</option>
          <option value="true">✅ Used Only</option>
          <option value="false">⏳ Pending Only</option>
        </select>
        <span style={S.totalBadge}>{total} records</span>
      </div>

      {/* Table */}
      <div style={S.tableWrap}>
        {loading ? <div style={S.loading}>Loading...</div> : (
          <table style={S.table}>
            <thead>
              <tr style={S.thead}>
                <th style={S.th}>Email</th>
                <th style={S.th}>IP Address</th>
                <th style={S.th}>OTP Code</th>
                <th style={S.th}>Attempts</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Created</th>
                <th style={S.th}>Expires</th>
                <th style={S.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {otps.map(otp => {
                const expired = new Date(otp.expiresAt) < new Date();
                return (
                  <tr key={otp._id} style={S.tr}>
                    <td style={S.td}>{otp.email}</td>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '12px' }}>{otp.ipAddress || '-'}</td>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '2px' }}>
                      {otp.used ? '••••••' : otp.otp}
                    </td>
                    <td style={{ ...S.td, color: otp.attempts > 3 ? '#c0392b' : '#333', fontWeight: 600 }}>{otp.attempts || 0}</td>
                    <td style={S.td}>
                      {otp.used
                        ? <span style={{ ...S.badge, background: '#d4edda', color: '#155724' }}>✅ Used</span>
                        : expired
                        ? <span style={{ ...S.badge, background: '#e2e3e5', color: '#666' }}>⏰ Expired</span>
                        : <span style={{ ...S.badge, background: '#fff3cd', color: '#856404' }}>⏳ Active</span>}
                    </td>
                    <td style={{ ...S.td, fontSize: '11px', color: '#888' }}>{new Date(otp.createdAt).toLocaleString('hi-IN')}</td>
                    <td style={{ ...S.td, fontSize: '11px', color: expired ? '#c0392b' : '#888' }}>{new Date(otp.expiresAt).toLocaleString('hi-IN')}</td>
                    <td style={S.td}>
                      {!otp.used && !expired && (
                        <button style={S.delBtn} onClick={() => handleDelete(otp._id)}>Invalidate</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div style={S.pagination}>
          <button style={S.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={S.pageInfo}>Page {page}</span>
          <button style={S.pageBtn} disabled={otps.length < 50} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '24px', maxWidth: '1100px' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title:     { margin: 0, fontSize: '24px', fontWeight: 700, color: '#2c2c2c' },
  subtitle:  { margin: '4px 0 0', color: '#888', fontSize: '14px' },
  cleanBtn:  { padding: '8px 16px', background: '#fff3cd', color: '#856404', border: '1px solid #ffc107', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  statsRow:  { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' },
  statCard:  { background: '#fff', border: '1px solid #e8e0d8', borderRadius: '10px', padding: '14px 20px', minWidth: '100px', textAlign: 'center' },
  statNum:   { fontSize: '24px', fontWeight: 700, color: '#2c2c2c' },
  statLabel: { fontSize: '11px', color: '#888', marginTop: '2px' },
  card:      { background: '#fff', border: '1px solid #e8e0d8', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' },
  cardTitle: { margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#2c2c2c' },
  ipChip:    { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#fdf8f3', border: '1px solid #e8e0d8', borderRadius: '20px', fontSize: '13px' },
  ipCount:   { background: '#c0392b', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 },
  filterRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' },
  filterInput: { padding: '7px 10px', border: '1.5px solid #e0d8cf', borderRadius: '8px', fontSize: '13px', outline: 'none' },
  totalBadge: { fontSize: '12px', color: '#888', background: '#f0f0f0', padding: '4px 10px', borderRadius: '10px', marginLeft: 'auto' },
  tableWrap: { background: '#fff', borderRadius: '12px', border: '1px solid #e8e0d8', overflow: 'auto' },
  loading:   { padding: '40px', textAlign: 'center', color: '#888' },
  table:     { width: '100%', borderCollapse: 'collapse' },
  thead:     { background: '#fdf8f3' },
  th:        { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: '11px', color: '#888', borderBottom: '1px solid #e8e0d8' },
  tr:        { borderBottom: '1px solid #f5f0ea' },
  td:        { padding: '10px 14px', fontSize: '13px', color: '#333' },
  badge:     { padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 },
  delBtn:    { padding: '3px 10px', background: '#fde8e8', color: '#c0392b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 },
  pagination: { display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', justifyContent: 'center' },
  pageBtn:   { padding: '5px 12px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontSize: '12px' },
  pageInfo:  { fontSize: '12px', color: '#666' },
};
