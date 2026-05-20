import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const STATUS_COLOR = {
  2: { bg: '#d4edda', color: '#155724' },
  3: { bg: '#d1ecf1', color: '#0c5460' },
  4: { bg: '#fff3cd', color: '#856404' },
  5: { bg: '#fde8e8', color: '#c0392b' },
};
const getStatusStyle = (code) => STATUS_COLOR[Math.floor(code / 100)] || {};

export default function AccessLogs() {
  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [stats, setStats]       = useState(null);
  const [topIPs, setTopIPs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('logs');
  const [page, setPage]         = useState(1);
  const [filters, setFilters]   = useState({ ip: '', path: '', statusCode: '', suspicious: '', method: '', startDate: '', endDate: '' });
  const [drillIP, setDrillIP]   = useState(null);
  const [drillData, setDrillData] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const data = await api.getAccessLogs(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [page, filters]);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getAccessLogStats({ days: 7 });
      setStats(data);
    } catch { }
  }, []);

  const loadTopIPs = useCallback(async () => {
    try {
      const data = await api.getTopIPs({ days: 7 });
      setTopIPs(data);
    } catch { }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { loadStats(); loadTopIPs(); }, [loadStats, loadTopIPs]);

  const handleDrillIP = async (ip) => {
    setDrillIP(ip);
    try {
      const data = await api.getIPLogs(ip, { limit: 50 });
      setDrillData(data);
    } catch (err) { toast.error(err.message); }
  };

  const handleClearLogs = async () => {
    const days = window.prompt('Kitne dino purane logs delete karein? (e.g. 30)');
    if (!days || isNaN(days)) return;
    if (!window.confirm(`${days} din se purane access logs delete karein?`)) return;
    try {
      const res = await api.clearAccessLogs({ olderThanDays: Number(days) });
      toast.success(res.message);
      loadLogs();
    } catch (err) { toast.error(err.message); }
  };

  const handleBlockIP = async (ip) => {
    try {
      await api.addIPBlacklist({ ip, reason: 'Blocked from access logs' });
      toast.success(`${ip} blacklist mein add kar diya`);
    } catch (err) { toast.error(err.message); }
  };

  const S = styles;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>📋 Access Logs</h1>
          <p style={S.subtitle}>Har request ka record — IP, path, status, time sab</p>
        </div>
        <button style={S.clearBtn} onClick={handleClearLogs}>🗑️ Purane Logs Clear</button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={S.statsRow}>
          <div style={S.statCard}>
            <div style={S.statNum}>{stats.total?.toLocaleString()}</div>
            <div style={S.statLabel}>Total (7 days)</div>
          </div>
          <div style={{ ...S.statCard, borderColor: '#c0392b' }}>
            <div style={{ ...S.statNum, color: '#c0392b' }}>{stats.suspicious?.toLocaleString()}</div>
            <div style={S.statLabel}>Suspicious</div>
          </div>
          {(stats.byStatus || []).slice(0, 3).map(s => (
            <div key={s._id} style={S.statCard}>
              <div style={{ ...S.statNum, ...getStatusStyle(s._id) }}>{s._id}</div>
              <div style={S.statLabel}>{s.count} requests</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={S.tabs}>
        {['logs', 'topIPs', ...(drillIP ? ['drill'] : [])].map(t => (
          <button key={t} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }} onClick={() => setTab(t)}>
            {t === 'logs' ? '📋 Logs' : t === 'topIPs' ? '🔝 Top IPs' : `🔍 ${drillIP}`}
          </button>
        ))}
      </div>

      {/* Logs Tab */}
      {tab === 'logs' && (
        <>
          {/* Filters */}
          <div style={S.filterRow}>
            {[
              { key: 'ip',         ph: '🔍 IP filter' },
              { key: 'path',       ph: '🛣️ Path filter' },
              { key: 'statusCode', ph: '📊 Status (e.g. 404)' },
            ].map(f => (
              <input
                key={f.key}
                style={S.filterInput}
                placeholder={f.ph}
                value={filters[f.key]}
                onChange={e => { setFilters(prev => ({ ...prev, [f.key]: e.target.value })); setPage(1); }}
              />
            ))}
            <select style={S.filterInput} value={filters.method} onChange={e => setFilters(p => ({ ...p, method: e.target.value }))}>
              <option value="">All Methods</option>
              {['GET','POST','PUT','DELETE','PATCH'].map(m => <option key={m}>{m}</option>)}
            </select>
            <select style={S.filterInput} value={filters.suspicious} onChange={e => setFilters(p => ({ ...p, suspicious: e.target.value }))}>
              <option value="">All</option>
              <option value="true">⚠️ Suspicious Only</option>
              <option value="false">✅ Normal Only</option>
            </select>
            <span style={S.totalBadge}>{total.toLocaleString()} logs</span>
          </div>

          <div style={S.tableWrap}>
            {loading ? <div style={S.loading}>Loading...</div> : (
              <table style={S.table}>
                <thead>
                  <tr style={S.thead}>
                    <th style={S.th}>Time</th>
                    <th style={S.th}>IP</th>
                    <th style={S.th}>Method</th>
                    <th style={S.th}>Path</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Response</th>
                    <th style={S.th}>User</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log._id} style={{ ...S.tr, background: log.suspicious ? '#fff8f0' : 'transparent' }}>
                      <td style={{ ...S.td, fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString('hi-IN')}
                      </td>
                      <td style={{ ...S.td, fontFamily: 'monospace' }}>
                        <button style={S.ipBtn} onClick={() => { handleDrillIP(log.ip); setTab('drill'); }}>
                          {log.ip}
                        </button>
                        {log.suspicious && <span title={log.suspiciousReason} style={S.suspBadge}>⚠️</span>}
                      </td>
                      <td style={S.td}><span style={S.methodBadge}>{log.method}</span></td>
                      <td style={{ ...S.td, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px' }}>{log.path}</td>
                      <td style={S.td}>
                        <span style={{ ...S.statusBadge, ...getStatusStyle(log.statusCode) }}>{log.statusCode}</span>
                      </td>
                      <td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{log.responseTimeMs}ms</td>
                      <td style={{ ...S.td, fontSize: '12px' }}>{log.userEmail || '-'}</td>
                      <td style={S.td}>
                        <button style={S.blockBtn} onClick={() => handleBlockIP(log.ip)} title="Block IP">🚫</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={S.pagination}>
              <button style={S.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={S.pageInfo}>Page {page} · {total.toLocaleString()} total</span>
              <button style={S.pageBtn} disabled={logs.length < 50} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        </>
      )}

      {/* Top IPs Tab */}
      {tab === 'topIPs' && (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr style={S.thead}>
                <th style={S.th}>#</th>
                <th style={S.th}>IP Address</th>
                <th style={S.th}>Total Requests</th>
                <th style={S.th}>Suspicious</th>
                <th style={S.th}>Last Seen</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {topIPs.map((item, i) => (
                <tr key={item._id} style={S.tr}>
                  <td style={{ ...S.td, fontWeight: 700, color: '#888' }}>{i + 1}</td>
                  <td style={{ ...S.td, fontFamily: 'monospace' }}>
                    <button style={S.ipBtn} onClick={() => { handleDrillIP(item._id); setTab('drill'); }}>{item._id}</button>
                  </td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{item.count.toLocaleString()}</td>
                  <td style={{ ...S.td, color: item.suspicious > 0 ? '#c0392b' : '#27ae60', fontWeight: 600 }}>{item.suspicious}</td>
                  <td style={{ ...S.td, fontSize: '12px' }}>{item.lastSeen ? new Date(item.lastSeen).toLocaleString('hi-IN') : '-'}</td>
                  <td style={S.td}>
                    <button style={S.blockBtn} onClick={() => handleBlockIP(item._id)}>🚫 Block</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* IP Drill-Down Tab */}
      {tab === 'drill' && drillData && (
        <div>
          <div style={S.drillHeader}>
            <span style={S.drillTitle}>🔍 IP: {drillIP}</span>
            <button style={S.blockBtn} onClick={() => handleBlockIP(drillIP)}>🚫 Block This IP</button>
          </div>
          {drillData.stats && (
            <div style={S.statsRow}>
              <div style={S.statCard}><div style={S.statNum}>{drillData.stats.total}</div><div style={S.statLabel}>Total Requests</div></div>
              <div style={S.statCard}><div style={{ ...S.statNum, color: '#c0392b' }}>{drillData.stats.suspicious}</div><div style={S.statLabel}>Suspicious</div></div>
              <div style={S.statCard}><div style={S.statNum}>{Math.round(drillData.stats.avgResponseTime || 0)}ms</div><div style={S.statLabel}>Avg Response</div></div>
              <div style={S.statCard}><div style={S.statNum}>{drillData.stats.firstSeen ? new Date(drillData.stats.firstSeen).toLocaleDateString() : '-'}</div><div style={S.statLabel}>First Seen</div></div>
            </div>
          )}
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr style={S.thead}>
                  <th style={S.th}>Time</th>
                  <th style={S.th}>Method</th>
                  <th style={S.th}>Path</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Response</th>
                  <th style={S.th}>Suspicious</th>
                </tr>
              </thead>
              <tbody>
                {drillData.logs?.map(log => (
                  <tr key={log._id} style={{ ...S.tr, background: log.suspicious ? '#fff8f0' : 'transparent' }}>
                    <td style={{ ...S.td, fontSize: '11px' }}>{new Date(log.timestamp).toLocaleString('hi-IN')}</td>
                    <td style={S.td}><span style={S.methodBadge}>{log.method}</span></td>
                    <td style={{ ...S.td, fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.path}</td>
                    <td style={S.td}><span style={{ ...S.statusBadge, ...getStatusStyle(log.statusCode) }}>{log.statusCode}</span></td>
                    <td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{log.responseTimeMs}ms</td>
                    <td style={S.td}>{log.suspicious ? <span style={{ color: '#c0392b' }}>⚠️ {log.suspiciousReason}</span> : '✅'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container:   { padding: '24px', maxWidth: '1200px' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title:       { margin: 0, fontSize: '24px', fontWeight: 700, color: '#2c2c2c' },
  subtitle:    { margin: '4px 0 0', color: '#888', fontSize: '14px' },
  clearBtn:    { padding: '8px 16px', background: '#fde8e8', color: '#c0392b', border: '1px solid #f5c6cb', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  statsRow:    { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' },
  statCard:    { background: '#fff', border: '1px solid #e8e0d8', borderRadius: '10px', padding: '14px 18px', minWidth: '100px', textAlign: 'center' },
  statNum:     { fontSize: '22px', fontWeight: 700, color: '#2c2c2c' },
  statLabel:   { fontSize: '11px', color: '#888', marginTop: '2px' },
  tabs:        { display: 'flex', gap: '8px', marginBottom: '14px' },
  tab:         { padding: '7px 16px', border: '1.5px solid #e8e0d8', borderRadius: '20px', background: '#fff', cursor: 'pointer', fontSize: '13px' },
  tabActive:   { background: '#c0392b', color: '#fff', borderColor: '#c0392b', fontWeight: 700 },
  filterRow:   { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' },
  filterInput: { padding: '7px 10px', border: '1.5px solid #e0d8cf', borderRadius: '8px', fontSize: '13px', outline: 'none' },
  totalBadge:  { fontSize: '12px', color: '#888', background: '#f0f0f0', padding: '4px 10px', borderRadius: '10px', marginLeft: 'auto' },
  tableWrap:   { background: '#fff', borderRadius: '12px', border: '1px solid #e8e0d8', overflow: 'auto' },
  loading:     { padding: '40px', textAlign: 'center', color: '#888' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  thead:       { background: '#fdf8f3' },
  th:          { padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: '11px', color: '#888', borderBottom: '1px solid #e8e0d8' },
  tr:          { borderBottom: '1px solid #f5f0ea' },
  td:          { padding: '8px 12px', fontSize: '12px', color: '#333' },
  ipBtn:       { background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, textDecoration: 'underline', padding: 0 },
  suspBadge:   { marginLeft: '4px', fontSize: '11px' },
  methodBadge: { padding: '2px 6px', background: '#e8f0fe', color: '#1a56db', borderRadius: '4px', fontSize: '10px', fontWeight: 600 },
  statusBadge: { padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 },
  blockBtn:    { padding: '3px 8px', background: '#fde8e8', color: '#c0392b', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 },
  pagination:  { display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', justifyContent: 'center' },
  pageBtn:     { padding: '5px 12px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontSize: '12px' },
  pageInfo:    { fontSize: '12px', color: '#666' },
  drillHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  drillTitle:  { fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: '#2c2c2c' },
};
