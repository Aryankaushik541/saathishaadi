import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function IPManagement() {
  const [blacklist, setBlacklist]   = useState([]);
  const [suspicious, setSuspicious] = useState({ inMemory: [], fromLogs: [] });
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('blacklist');
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [form, setForm]             = useState({ ip: '', reason: '', expiresAt: '' });
  const [adding, setAdding]         = useState(false);

  const loadBlacklist = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getIPBlacklist({ page, limit: 30, search });
      setBlacklist(data.ips || []);
      setTotal(data.total || 0);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [page, search]);

  const loadSuspicious = useCallback(async () => {
    try {
      const data = await api.getSuspiciousIPs();
      setSuspicious(data);
    } catch (err) { toast.error(err.message); }
  }, []);

  useEffect(() => { if (tab === 'blacklist') loadBlacklist(); }, [tab, loadBlacklist]);
  useEffect(() => { if (tab === 'suspicious') loadSuspicious(); }, [tab, loadSuspicious]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.ip.trim()) return toast.error('IP address daalen');
    setAdding(true);
    try {
      await api.addIPBlacklist(form);
      toast.success(`${form.ip} blacklist mein add ho gaya`);
      setForm({ ip: '', reason: '', expiresAt: '' });
      loadBlacklist();
    } catch (err) { toast.error(err.message); }
    finally { setAdding(false); }
  };

  const handleRemove = async (ip) => {
    if (!window.confirm(`${ip} ko blacklist se remove karen?`)) return;
    try {
      await api.removeIPBlacklist(ip);
      toast.success(`${ip} remove ho gaya`);
      loadBlacklist();
    } catch (err) { toast.error(err.message); }
  };

  const handleClearAuto = async () => {
    if (!window.confirm('Sare auto-blocked IPs clear karen?')) return;
    try {
      const res = await api.clearAutoBlocked();
      toast.success(res.message);
      loadBlacklist();
    } catch (err) { toast.error(err.message); }
  };

  const handleBlockSuspicious = async (ip) => {
    try {
      await api.addIPBlacklist({ ip, reason: 'Suspicious activity detected' });
      toast.success(`${ip} blacklist mein add kar diya`);
    } catch (err) { toast.error(err.message); }
  };

  const S = styles;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <h1 style={S.title}>🌐 IP Management</h1>
        <p style={S.subtitle}>IP blacklist manage karein, suspicious IPs dekhein</p>
      </div>

      {/* Add IP Form */}
      <div style={S.card}>
        <h3 style={S.cardTitle}>➕ IP Blacklist Mein Add Karein</h3>
        <form style={S.form} onSubmit={handleAdd}>
          <input
            style={S.input}
            placeholder="IP Address (e.g. 192.168.1.1)"
            value={form.ip}
            onChange={e => setForm(f => ({ ...f, ip: e.target.value }))}
          />
          <input
            style={S.input}
            placeholder="Reason (optional)"
            value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
          />
          <input
            style={S.input}
            type="datetime-local"
            title="Expiry Date (blank = permanent)"
            value={form.expiresAt}
            onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
          />
          <button style={S.addBtn} type="submit" disabled={adding}>
            {adding ? 'Adding...' : '🚫 Block IP'}
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {['blacklist', 'suspicious'].map(t => (
          <button
            key={t}
            style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {t === 'blacklist' ? `🚫 Blacklist (${total})` : '⚠️ Suspicious IPs'}
          </button>
        ))}
        {tab === 'blacklist' && (
          <button style={S.clearBtn} onClick={handleClearAuto}>
            🧹 Clear Auto-Blocked
          </button>
        )}
      </div>

      {/* Search */}
      {tab === 'blacklist' && (
        <div style={S.searchRow}>
          <input
            style={{ ...S.input, width: '260px', marginBottom: 0 }}
            placeholder="🔍 IP se search karein..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <span style={S.totalBadge}>{total} IPs blacklisted</span>
        </div>
      )}

      {/* Blacklist Table */}
      {tab === 'blacklist' && (
        <div style={S.tableWrap}>
          {loading ? (
            <div style={S.loading}>Loading...</div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr style={S.thead}>
                  <th style={S.th}>IP Address</th>
                  <th style={S.th}>Reason</th>
                  <th style={S.th}>Type</th>
                  <th style={S.th}>Requests</th>
                  <th style={S.th}>Added On</th>
                  <th style={S.th}>Expires</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {blacklist.map(item => (
                  <tr key={item._id} style={S.tr}>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 600 }}>{item.ip}</td>
                    <td style={S.td}>{item.reason}</td>
                    <td style={S.td}>
                      <span style={{ ...S.badge, background: item.autoBlocked ? '#fff3cd' : '#fde8e8', color: item.autoBlocked ? '#856404' : '#c0392b' }}>
                        {item.autoBlocked ? '🤖 Auto' : '👤 Manual'}
                      </span>
                    </td>
                    <td style={S.td}>{item.requestCount || '-'}</td>
                    <td style={S.td}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('hi-IN') : '-'}</td>
                    <td style={S.td}>{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString('hi-IN') : '♾️ Permanent'}</td>
                    <td style={S.td}>
                      <span style={{ ...S.badge, background: item.isActive ? '#d4edda' : '#e2e3e5', color: item.isActive ? '#155724' : '#666' }}>
                        {item.isActive ? '🔴 Blocked' : '✅ Removed'}
                      </span>
                    </td>
                    <td style={S.td}>
                      <button style={S.unblockBtn} onClick={() => handleRemove(item.ip)}>
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {/* Pagination */}
          <div style={S.pagination}>
            <button style={S.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={S.pageInfo}>Page {page}</span>
            <button style={S.pageBtn} disabled={blacklist.length < 30} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {/* Suspicious IPs */}
      {tab === 'suspicious' && (
        <div style={S.tableWrap}>
          <h4 style={S.sectionHead}>⚡ In-Memory Suspicious (Current Session)</h4>
          <table style={S.table}>
            <thead>
              <tr style={S.thead}>
                <th style={S.th}>IP</th>
                <th style={S.th}>Request Count</th>
                <th style={S.th}>First Seen</th>
                <th style={S.th}>Age</th>
                <th style={S.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {suspicious.inMemory?.length === 0 && (
                <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: '#888' }}>Koi suspicious IP nahi</td></tr>
              )}
              {suspicious.inMemory?.map((item, i) => (
                <tr key={i} style={S.tr}>
                  <td style={{ ...S.td, fontFamily: 'monospace' }}>{item.ip}</td>
                  <td style={{ ...S.td, fontWeight: 600, color: item.count > 100 ? '#c0392b' : '#333' }}>{item.count}</td>
                  <td style={S.td}>{new Date(item.firstSeen).toLocaleTimeString()}</td>
                  <td style={S.td}>{Math.round(item.age / 1000)}s</td>
                  <td style={S.td}>
                    <button style={S.blockBtn} onClick={() => handleBlockSuspicious(item.ip)}>🚫 Block</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ ...S.sectionHead, marginTop: '24px' }}>📋 From Access Logs (Historical)</h4>
          <table style={S.table}>
            <thead>
              <tr style={S.thead}>
                <th style={S.th}>IP</th>
                <th style={S.th}>Suspicious Hits</th>
                <th style={S.th}>Last Seen</th>
                <th style={S.th}>Reasons</th>
                <th style={S.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {suspicious.fromLogs?.length === 0 && (
                <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: '#888' }}>Koi data nahi</td></tr>
              )}
              {suspicious.fromLogs?.map((item, i) => (
                <tr key={i} style={S.tr}>
                  <td style={{ ...S.td, fontFamily: 'monospace' }}>{item._id}</td>
                  <td style={{ ...S.td, fontWeight: 600, color: '#c0392b' }}>{item.count}</td>
                  <td style={S.td}>{item.lastSeen ? new Date(item.lastSeen).toLocaleString('hi-IN') : '-'}</td>
                  <td style={{ ...S.td, fontSize: '11px', maxWidth: '200px' }}>{(item.reasons || []).slice(0,2).join(', ')}</td>
                  <td style={S.td}>
                    <button style={S.blockBtn} onClick={() => handleBlockSuspicious(item._id)}>🚫 Block</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container:   { padding: '24px', maxWidth: '1100px' },
  header:      { marginBottom: '20px' },
  title:       { margin: 0, fontSize: '24px', fontWeight: 700, color: '#2c2c2c' },
  subtitle:    { margin: '4px 0 0', color: '#888', fontSize: '14px' },
  card:        { background: '#fff', borderRadius: '12px', border: '1px solid #e8e0d8', padding: '18px 20px', marginBottom: '20px' },
  cardTitle:   { margin: '0 0 14px', fontSize: '15px', fontWeight: 600, color: '#2c2c2c' },
  form:        { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' },
  input:       { padding: '8px 12px', border: '1.5px solid #e0d8cf', borderRadius: '8px', fontSize: '13px', outline: 'none', marginBottom: '0' },
  addBtn:      { padding: '8px 18px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  tabs:        { display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center' },
  tab:         { padding: '8px 18px', border: '1.5px solid #e8e0d8', borderRadius: '20px', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500 },
  tabActive:   { background: '#c0392b', color: '#fff', borderColor: '#c0392b', fontWeight: 700 },
  clearBtn:    { marginLeft: 'auto', padding: '7px 14px', background: '#fff3cd', color: '#856404', border: '1px solid #ffc107', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  searchRow:   { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' },
  totalBadge:  { fontSize: '12px', color: '#888', background: '#f0f0f0', padding: '4px 10px', borderRadius: '10px' },
  tableWrap:   { background: '#fff', borderRadius: '12px', border: '1px solid #e8e0d8', overflow: 'auto' },
  loading:     { padding: '40px', textAlign: 'center', color: '#888' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  thead:       { background: '#fdf8f3' },
  th:          { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: '#888', borderBottom: '1px solid #e8e0d8' },
  tr:          { borderBottom: '1px solid #f5f0ea' },
  td:          { padding: '10px 14px', fontSize: '13px', color: '#333' },
  badge:       { padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 },
  unblockBtn:  { padding: '4px 10px', background: '#d4edda', color: '#155724', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  blockBtn:    { padding: '4px 10px', background: '#fde8e8', color: '#c0392b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  pagination:  { display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', justifyContent: 'center' },
  pageBtn:     { padding: '6px 14px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontSize: '13px' },
  pageInfo:    { fontSize: '13px', color: '#666' },
  sectionHead: { margin: '16px 16px 10px', fontSize: '14px', fontWeight: 600, color: '#2c2c2c' },
};
