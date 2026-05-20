import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

function fmtUptime(sec) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
}

export default function SystemHealth() {
  const [health, setHealth]           = useState(null);
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [toggling, setToggling]       = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getSystemHealth();
      setHealth(data);
      setLastRefresh(new Date());
    } catch (err) { toast.error('Health check failed: ' + err.message); }
    finally { setLoading(false); }
  }, []);

  const loadMaintenanceSetting = useCallback(async () => {
    try {
      const settings = await api.getSettings({ category: 'system' });
      const ms = settings.find(s => s.key === 'system.maintenanceMode');
      if (ms) setMaintenance(!!ms.value);
    } catch { }
  }, []);

  useEffect(() => {
    load();
    loadMaintenanceSetting();
    const interval = setInterval(load, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [load, loadMaintenanceSetting]);

  const handleRefreshSettings = async () => {
    setRefreshing(true);
    try {
      const res = await api.refreshSettings();
      toast.success(res.message);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setRefreshing(false); }
  };

  const handleToggleMaintenance = async () => {
    if (!window.confirm(maintenance
      ? 'Maintenance mode band karein? Users phir access kar sakenge.'
      : '⚠️ Maintenance mode enable karein? Sare users ko block kar dega!')) return;
    setToggling(true);
    try {
      const res = await api.setMaintenanceMode(!maintenance);
      setMaintenance(res.enabled);
      toast.success(res.message);
    } catch (err) { toast.error(err.message); }
    finally { setToggling(false); }
  };

  const S = styles;

  if (loading) return <div style={S.loading}>🖥️ System health check ho rahi hai...</div>;

  const dbConnected = health?.db?.status === 'connected';
  const loadAvg = health?.system?.loadAvg || [0, 0, 0];
  const memPct = health?.system ? Math.round(
    ((parseFloat(health.system.totalMemGB) - parseFloat(health.system.freeMemGB)) / parseFloat(health.system.totalMemGB)) * 100
  ) : 0;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🖥️ System Health</h1>
          <p style={S.subtitle}>Server status, memory, database — real-time monitoring</p>
        </div>
        <div style={S.headerActions}>
          <span style={S.lastRefresh}>{lastRefresh ? `Updated: ${lastRefresh.toLocaleTimeString()}` : ''}</span>
          <button style={S.refreshBtn} onClick={load}>🔄 Refresh</button>
          <button style={S.settingsRefreshBtn} onClick={handleRefreshSettings} disabled={refreshing}>
            {refreshing ? '⏳...' : '⚙️ Apply Settings'}
          </button>
        </div>
      </div>

      {/* Maintenance Mode Banner */}
      {maintenance && (
        <div style={S.maintenanceBanner}>
          ⚠️ <strong>Maintenance Mode ACTIVE</strong> — Sare users ka access block hai. Sirf admin panel kaam kar raha hai.
        </div>
      )}

      {/* Status Cards */}
      <div style={S.cardsRow}>
        <div style={{ ...S.statusCard, borderColor: health?.status === 'OK' ? '#27ae60' : '#c0392b' }}>
          <div style={S.statusIcon}>{health?.status === 'OK' ? '✅' : '❌'}</div>
          <div style={S.statusLabel}>Server Status</div>
          <div style={{ ...S.statusValue, color: health?.status === 'OK' ? '#27ae60' : '#c0392b' }}>
            {health?.status || 'Unknown'}
          </div>
        </div>
        <div style={{ ...S.statusCard, borderColor: dbConnected ? '#27ae60' : '#c0392b' }}>
          <div style={S.statusIcon}>{dbConnected ? '🟢' : '🔴'}</div>
          <div style={S.statusLabel}>MongoDB</div>
          <div style={{ ...S.statusValue, color: dbConnected ? '#27ae60' : '#c0392b' }}>
            {health?.db?.status || 'Unknown'}
          </div>
        </div>
        <div style={S.statusCard}>
          <div style={S.statusIcon}>⏱️</div>
          <div style={S.statusLabel}>Uptime</div>
          <div style={S.statusValue}>{health?.uptime ? fmtUptime(health.uptime) : '-'}</div>
        </div>
        <div style={S.statusCard}>
          <div style={S.statusIcon}>🟢</div>
          <div style={S.statusLabel}>Node.js</div>
          <div style={S.statusValue}>{health?.nodeVersion || '-'}</div>
        </div>
      </div>

      {/* Grid */}
      <div style={S.grid}>
        {/* Memory */}
        <div style={S.card}>
          <h3 style={S.cardTitle}>💾 Process Memory (Node.js)</h3>
          <div style={S.memRow}><span style={S.memLabel}>RSS</span><span style={S.memVal}>{health?.memory?.rss}</span></div>
          <div style={S.memRow}><span style={S.memLabel}>Heap Used</span><span style={S.memVal}>{health?.memory?.heapUsed}</span></div>
          <div style={S.memRow}><span style={S.memLabel}>Heap Total</span><span style={S.memVal}>{health?.memory?.heapTotal}</span></div>
        </div>

        {/* System */}
        <div style={S.card}>
          <h3 style={S.cardTitle}>🖥️ System Resources</h3>
          <div style={S.memRow}><span style={S.memLabel}>Platform</span><span style={S.memVal}>{health?.system?.platform}</span></div>
          <div style={S.memRow}><span style={S.memLabel}>CPUs</span><span style={S.memVal}>{health?.system?.cpus} cores</span></div>
          <div style={S.memRow}><span style={S.memLabel}>Total RAM</span><span style={S.memVal}>{health?.system?.totalMemGB} GB</span></div>
          <div style={S.memRow}><span style={S.memLabel}>Free RAM</span><span style={S.memVal}>{health?.system?.freeMemGB} GB</span></div>
          <div style={S.memRow}><span style={S.memLabel}>RAM Used</span><span style={S.memVal}>{memPct}%</span></div>
          <div style={S.progressBar}><div style={{ ...S.progressFill, width: `${memPct}%`, background: memPct > 80 ? '#c0392b' : '#27ae60' }} /></div>
          <div style={S.memRow}><span style={S.memLabel}>Load Avg</span><span style={S.memVal}>{loadAvg.map(l => l.toFixed(2)).join(' / ')}</span></div>
        </div>

        {/* DB */}
        <div style={S.card}>
          <h3 style={S.cardTitle}>🗄️ Database Info</h3>
          <div style={S.memRow}><span style={S.memLabel}>Host</span><span style={{ ...S.memVal, fontFamily: 'monospace', fontSize: '12px' }}>{health?.db?.host || '-'}</span></div>
          <div style={S.memRow}><span style={S.memLabel}>Database</span><span style={S.memVal}>{health?.db?.name || '-'}</span></div>
          <div style={S.memRow}><span style={S.memLabel}>Status</span><span style={{ ...S.memVal, color: dbConnected ? '#27ae60' : '#c0392b', fontWeight: 700 }}>{health?.db?.status}</span></div>
        </div>

        {/* Security */}
        <div style={S.card}>
          <h3 style={S.cardTitle}>🔐 Security (In-Memory)</h3>
          <div style={S.memRow}><span style={S.memLabel}>Blacklisted IPs</span><span style={{ ...S.memVal, color: '#c0392b', fontWeight: 700 }}>{health?.security?.inMemoryBlacklist}</span></div>
          <div style={S.memRow}><span style={S.memLabel}>Suspicious IPs</span><span style={{ ...S.memVal, color: '#f39c12', fontWeight: 700 }}>{health?.security?.inMemorySuspicious}</span></div>
        </div>
      </div>

      {/* Maintenance Mode Control */}
      <div style={{ ...S.card, marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderColor: maintenance ? '#c0392b' : '#e8e0d8' }}>
        <div>
          <h3 style={{ ...S.cardTitle, marginBottom: '4px' }}>🔧 Maintenance Mode</h3>
          <p style={S.mainDesc}>Enable karne par sare users ka API access band ho jata hai. Sirf admin panel kaam karta hai.</p>
        </div>
        <button
          style={{ ...S.maintBtn, background: maintenance ? '#c0392b' : '#27ae60' }}
          onClick={handleToggleMaintenance}
          disabled={toggling}
        >
          {toggling ? '⏳ Please wait...' : maintenance ? '✅ Maintenance OFF Karein' : '⚠️ Maintenance ON Karein'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container:      { padding: '24px', maxWidth: '1000px' },
  loading:        { padding: '60px', textAlign: 'center', color: '#888', fontSize: '16px' },
  header:         { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  title:          { margin: 0, fontSize: '24px', fontWeight: 700, color: '#2c2c2c' },
  subtitle:       { margin: '4px 0 0', color: '#888', fontSize: '14px' },
  headerActions:  { display: 'flex', gap: '10px', alignItems: 'center' },
  lastRefresh:    { fontSize: '11px', color: '#aaa' },
  refreshBtn:     { padding: '7px 14px', background: '#fff', border: '1.5px solid #e8e0d8', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  settingsRefreshBtn: { padding: '7px 14px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  maintenanceBanner: { background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '10px', padding: '12px 18px', marginBottom: '20px', color: '#856404', fontSize: '14px' },
  cardsRow:       { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' },
  statusCard:     { background: '#fff', border: '2px solid #e8e0d8', borderRadius: '12px', padding: '18px 20px', textAlign: 'center', minWidth: '130px', flex: 1 },
  statusIcon:     { fontSize: '28px', marginBottom: '4px' },
  statusLabel:    { fontSize: '11px', color: '#888', marginBottom: '4px' },
  statusValue:    { fontSize: '16px', fontWeight: 700, color: '#2c2c2c' },
  grid:           { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  card:           { background: '#fff', border: '1px solid #e8e0d8', borderRadius: '12px', padding: '18px 20px' },
  cardTitle:      { margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: '#2c2c2c' },
  memRow:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  memLabel:       { fontSize: '13px', color: '#888' },
  memVal:         { fontSize: '13px', fontWeight: 600, color: '#2c2c2c' },
  progressBar:    { height: '6px', background: '#f0f0f0', borderRadius: '3px', margin: '4px 0 12px', overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: '3px', transition: 'width 0.5s' },
  mainDesc:       { fontSize: '13px', color: '#888', margin: 0, maxWidth: '500px', lineHeight: '1.5' },
  maintBtn:       { padding: '10px 20px', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' },
};
