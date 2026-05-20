import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const STATUS_STYLES = {
  completed: { bg: '#d4edda', color: '#155724' },
  missed:    { bg: '#fff3cd', color: '#856404' },
  rejected:  { bg: '#fde8e8', color: '#c0392b' },
  ongoing:   { bg: '#d1ecf1', color: '#0c5460' },
  failed:    { bg: '#e2e3e5', color: '#666' },
};

function fmtDuration(sec) {
  if (!sec) return '-';
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}m ${s}s`;
}

export default function CallLogs() {
  const [calls, setCalls]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [stats, setStats]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [filters, setFilters] = useState({ callType: '', status: '', search: '' });
  const [recEnabled, setRecEnabled] = useState(false);
  const [recRetention, setRecRetention] = useState(90);
  const [savingRec, setSavingRec] = useState(false);

  const loadCalls = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (filters.callType) params.callType = filters.callType;
      if (filters.status)   params.status   = filters.status;
      if (filters.search)   params.search   = filters.search;
      const data = await api.getCallLogs(params);
      setCalls(data.calls || []);
      setTotal(data.total || 0);
      setStats(data.stats || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [page, filters]);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await api.getSettings({ category: 'call' });
      const recSetting = settings.find(s => s.key === 'call.recordingEnabled');
      const retSetting = settings.find(s => s.key === 'call.recordingRetentionDays');
      if (recSetting) setRecEnabled(!!recSetting.value);
      if (retSetting) setRecRetention(retSetting.value);
    } catch { }
  }, []);

  useEffect(() => { loadCalls(); }, [loadCalls]);
  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleToggleRecording = async () => {
    setSavingRec(true);
    try {
      const newVal = !recEnabled;
      await api.updateSetting('call.recordingEnabled', newVal);
      setRecEnabled(newVal);
      toast.success(`Auto recording ${newVal ? 'enable' : 'disable'} kar diya`);
    } catch (err) { toast.error(err.message); }
    finally { setSavingRec(false); }
  };

  const handleRetentionSave = async () => {
    try {
      await api.updateSetting('call.recordingRetentionDays', Number(recRetention));
      toast.success('Retention period save ho gaya');
    } catch (err) { toast.error(err.message); }
  };

  const handleDeleteLog = async (id) => {
    try {
      await api.deleteCallLog(id);
      toast.success('Call log delete ho gaya');
      loadCalls();
    } catch (err) { toast.error(err.message); }
  };

  const handleClearOld = async () => {
    const days = window.prompt('Kitne dino purane call logs delete karein?');
    if (!days || isNaN(days)) return;
    if (!window.confirm(`${days} din purane call logs delete karein?`)) return;
    try {
      const res = await api.clearCallLogs({ olderThanDays: Number(days) });
      toast.success(res.message);
      loadCalls();
    } catch (err) { toast.error(err.message); }
  };

  const S = styles;
  const completedStat = stats.find(s => s._id === 'completed');
  const totalDuration = completedStat?.totalDuration || 0;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>📞 Call Logs</h1>
          <p style={S.subtitle}>Video aur audio call ka poora record — recording settings bhi</p>
        </div>
        <button style={S.clearBtn} onClick={handleClearOld}>🗑️ Purane Logs Clear</button>
      </div>

      {/* Recording Settings Card */}
      <div style={S.recCard}>
        <div style={S.recCardLeft}>
          <div style={S.recTitle}>🎙️ Auto Call Recording</div>
          <div style={S.recDesc}>Enable hone par sare video/audio calls auto-record honge. Recording URL call log mein save hogi.</div>
        </div>
        <div style={S.recControls}>
          <label style={S.toggle}>
            <input type="checkbox" checked={recEnabled} onChange={handleToggleRecording} disabled={savingRec} style={{ display: 'none' }} />
            <div style={{ ...S.toggleTrack, background: recEnabled ? '#c0392b' : '#ccc' }}>
              <div style={{ ...S.toggleThumb, transform: recEnabled ? 'translateX(22px)' : 'translateX(2px)' }} />
            </div>
            <span style={S.toggleLabel}>{recEnabled ? '🔴 Recording ON' : '⚫ Recording OFF'}</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <label style={S.retLabel}>Retention:</label>
            <input
              type="number"
              value={recRetention}
              onChange={e => setRecRetention(e.target.value)}
              style={S.retInput}
              min={1} max={365}
            />
            <span style={S.retLabel}>days</span>
            <button style={S.saveRetBtn} onClick={handleRetentionSave}>Save</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={S.statsRow}>
        <div style={S.statCard}><div style={S.statNum}>{total}</div><div style={S.statLabel}>Total Calls</div></div>
        {stats.map(s => (
          <div key={s._id} style={{ ...S.statCard, borderColor: STATUS_STYLES[s._id]?.color || '#e8e0d8' }}>
            <div style={{ ...S.statNum, color: STATUS_STYLES[s._id]?.color }}>{s.count}</div>
            <div style={S.statLabel}>{s._id}</div>
          </div>
        ))}
        <div style={S.statCard}>
          <div style={S.statNum}>{fmtDuration(totalDuration)}</div>
          <div style={S.statLabel}>Total Duration</div>
        </div>
      </div>

      {/* Filters */}
      <div style={S.filterRow}>
        <select style={S.filterInput} value={filters.callType} onChange={e => setFilters(f => ({ ...f, callType: e.target.value }))}>
          <option value="">All Types</option>
          <option value="video">📹 Video</option>
          <option value="audio">🎵 Audio</option>
          <option value="voice">🎙️ Voice</option>
        </select>
        <select style={S.filterInput} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          {['completed','missed','rejected','ongoing','failed'].map(s => <option key={s}>{s}</option>)}
        </select>
        <input
          style={S.filterInput}
          placeholder="🔍 Name/Email search..."
          value={filters.search}
          onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
        />
        <span style={S.totalBadge}>{total} calls</span>
      </div>

      {/* Table */}
      <div style={S.tableWrap}>
        {loading ? <div style={S.loading}>Loading...</div> : (
          <table style={S.table}>
            <thead>
              <tr style={S.thead}>
                <th style={S.th}>Type</th>
                <th style={S.th}>Caller</th>
                <th style={S.th}>Receiver</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Duration</th>
                <th style={S.th}>Recording</th>
                <th style={S.th}>Start Time</th>
                <th style={S.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {calls.map(call => (
                <tr key={call._id} style={S.tr}>
                  <td style={S.td}>
                    <span style={S.typeBadge}>
                      {call.callType === 'video' ? '📹' : '🎙️'} {call.callType}
                    </span>
                  </td>
                  <td style={S.td}>
                    <div style={S.personName}>{call.callerName || '-'}</div>
                    <div style={S.personEmail}>{call.callerEmail || '-'}</div>
                  </td>
                  <td style={S.td}>
                    <div style={S.personName}>{call.receiverName || '-'}</div>
                    <div style={S.personEmail}>{call.receiverEmail || '-'}</div>
                  </td>
                  <td style={S.td}>
                    <span style={{ ...S.badge, ...STATUS_STYLES[call.status] }}>{call.status}</span>
                  </td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{fmtDuration(call.durationSeconds)}</td>
                  <td style={S.td}>
                    {call.recordingEnabled
                      ? call.recordingUrl
                        ? <a href={call.recordingUrl} target="_blank" rel="noreferrer" style={{ color: '#c0392b', fontSize: '12px' }}>▶️ Play</a>
                        : <span style={{ color: '#888', fontSize: '11px' }}>⏳ Saving...</span>
                      : <span style={{ color: '#aaa', fontSize: '11px' }}>—</span>}
                  </td>
                  <td style={{ ...S.td, fontSize: '11px', color: '#888' }}>
                    {call.startTime ? new Date(call.startTime).toLocaleString('hi-IN') : '-'}
                  </td>
                  <td style={S.td}>
                    <button style={S.delBtn} onClick={() => handleDeleteLog(call._id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={S.pagination}>
          <button style={S.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={S.pageInfo}>Page {page} · {total} total</span>
          <button style={S.pageBtn} disabled={calls.length < 30} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container:   { padding: '24px', maxWidth: '1200px' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title:       { margin: 0, fontSize: '24px', fontWeight: 700, color: '#2c2c2c' },
  subtitle:    { margin: '4px 0 0', color: '#888', fontSize: '14px' },
  clearBtn:    { padding: '8px 16px', background: '#fde8e8', color: '#c0392b', border: '1px solid #f5c6cb', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  recCard:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '2px solid #e8e0d8', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' },
  recCardLeft: { flex: 1 },
  recTitle:    { fontSize: '16px', fontWeight: 700, color: '#2c2c2c', marginBottom: '4px' },
  recDesc:     { fontSize: '13px', color: '#888', maxWidth: '500px', lineHeight: '1.5' },
  recControls: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' },
  toggle:      { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
  toggleTrack: { width: '46px', height: '24px', borderRadius: '12px', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' },
  toggleThumb: { position: 'absolute', top: '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  toggleLabel: { fontSize: '14px', fontWeight: 600, color: '#2c2c2c' },
  retLabel:    { fontSize: '13px', color: '#666' },
  retInput:    { width: '60px', padding: '5px 8px', border: '1.5px solid #e0d8cf', borderRadius: '6px', fontSize: '13px', outline: 'none' },
  saveRetBtn:  { padding: '5px 12px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  statsRow:    { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' },
  statCard:    { background: '#fff', border: '1px solid #e8e0d8', borderRadius: '10px', padding: '14px 18px', minWidth: '100px', textAlign: 'center' },
  statNum:     { fontSize: '20px', fontWeight: 700, color: '#2c2c2c' },
  statLabel:   { fontSize: '11px', color: '#888', marginTop: '2px', textTransform: 'capitalize' },
  filterRow:   { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' },
  filterInput: { padding: '7px 10px', border: '1.5px solid #e0d8cf', borderRadius: '8px', fontSize: '13px', outline: 'none' },
  totalBadge:  { fontSize: '12px', color: '#888', background: '#f0f0f0', padding: '4px 10px', borderRadius: '10px', marginLeft: 'auto' },
  tableWrap:   { background: '#fff', borderRadius: '12px', border: '1px solid #e8e0d8', overflow: 'auto' },
  loading:     { padding: '40px', textAlign: 'center', color: '#888' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  thead:       { background: '#fdf8f3' },
  th:          { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: '11px', color: '#888', borderBottom: '1px solid #e8e0d8' },
  tr:          { borderBottom: '1px solid #f5f0ea' },
  td:          { padding: '10px 14px', fontSize: '13px', color: '#333' },
  typeBadge:   { padding: '2px 8px', background: '#f0f0f0', borderRadius: '10px', fontSize: '11px', fontWeight: 600 },
  badge:       { padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 },
  personName:  { fontWeight: 600, fontSize: '13px' },
  personEmail: { fontSize: '11px', color: '#888' },
  delBtn:      { padding: '4px 8px', background: '#fde8e8', color: '#c0392b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  pagination:  { display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', justifyContent: 'center' },
  pageBtn:     { padding: '5px 12px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontSize: '12px' },
  pageInfo:    { fontSize: '12px', color: '#666' },
};
