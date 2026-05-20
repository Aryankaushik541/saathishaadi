import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const CATEGORY_LABELS = {
  rate_limit:   { icon: '⏱️', label: 'Rate Limits' },
  otp:          { icon: '🔢', label: 'OTP Settings' },
  security:     { icon: '🛡️', label: 'Security & DDoS' },
  cors:         { icon: '🌐', label: 'CORS Settings' },
  call:         { icon: '📞', label: 'Call & Recording' },
  system:       { icon: '⚙️', label: 'System Settings' },
  notification: { icon: '🔔', label: 'Notifications' },
};

const MS_PRESETS = [
  { label: '1 min',   value: 60000 },
  { label: '5 min',   value: 300000 },
  { label: '10 min',  value: 600000 },
  { label: '15 min',  value: 900000 },
  { label: '30 min',  value: 1800000 },
  { label: '1 hour',  value: 3600000 },
];

function msToLabel(ms) {
  if (ms < 60000) return `${ms / 1000}s`;
  if (ms < 3600000) return `${ms / 60000} min`;
  return `${ms / 3600000} hour`;
}

function SettingInput({ setting, onChange }) {
  const [localVal, setLocalVal] = useState(setting.value);

  useEffect(() => setLocalVal(setting.value), [setting.value]);

  const handleSave = () => {
    let v = localVal;
    if (setting.valueType === 'number') v = Number(v);
    if (setting.valueType === 'boolean') v = Boolean(v);
    onChange(setting.key, v);
  };

  const isMs = setting.key.includes('windowMs') || setting.key.includes('.windowMs');

  return (
    <div style={styles.settingRow}>
      <div style={styles.settingInfo}>
        <div style={styles.settingLabel}>{setting.label || setting.key}</div>
        {setting.description && (
          <div style={styles.settingDesc}>{setting.description}</div>
        )}
        <div style={styles.settingKey}>{setting.key}</div>
      </div>
      <div style={styles.settingControl}>
        {setting.valueType === 'boolean' ? (
          <label style={styles.toggle}>
            <input
              type="checkbox"
              checked={!!localVal}
              onChange={e => {
                setLocalVal(e.target.checked);
                onChange(setting.key, e.target.checked);
              }}
              style={{ display: 'none' }}
            />
            <div style={{ ...styles.toggleTrack, background: localVal ? '#c0392b' : '#ccc' }}>
              <div style={{ ...styles.toggleThumb, transform: localVal ? 'translateX(22px)' : 'translateX(2px)' }} />
            </div>
            <span style={styles.toggleLabel}>{localVal ? 'Enabled' : 'Disabled'}</span>
          </label>
        ) : (
          <div style={styles.inputGroup}>
            {isMs && (
              <div style={styles.presets}>
                {MS_PRESETS.map(p => (
                  <button
                    key={p.value}
                    style={{
                      ...styles.presetBtn,
                      ...(Number(localVal) === p.value ? styles.presetBtnActive : {}),
                    }}
                    onClick={() => setLocalVal(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <div style={styles.inputRow}>
              <input
                type={setting.valueType === 'number' ? 'number' : 'text'}
                value={localVal}
                onChange={e => setLocalVal(setting.valueType === 'number' ? Number(e.target.value) : e.target.value)}
                style={styles.input}
              />
              {isMs && <span style={styles.inputSuffix}>({msToLabel(Number(localVal))})</span>}
              <button style={styles.saveBtn} onClick={handleSave}>Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SecuritySettings() {
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rate_limit');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getSettingsGrouped();
      setGrouped(data);
    } catch (err) {
      toast.error(err.message || 'Settings load error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = async (key, value) => {
    try {
      await api.updateSetting(key, value);
      toast.success(`✅ ${key} updated`);
      // Update local state
      setGrouped(prev => {
        const updated = { ...prev };
        for (const cat of Object.keys(updated)) {
          updated[cat] = updated[cat].map(s =>
            s.key === key ? { ...s, value } : s
          );
        }
        return updated;
      });
    } catch (err) {
      toast.error(err.message || 'Update error');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Sab settings default pe reset kar dein? Ye undo nahi ho sakta.')) return;
    try {
      await api.resetSettings();
      toast.success('Settings reset ho gayi');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.refreshSettings();
      toast.success('Rate limiters refresh ho gaye');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const tabs = Object.keys(grouped).filter(k => CATEGORY_LABELS[k]);

  if (loading) return <div style={styles.loading}>Settings load ho rahi hain...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🔐 Security Settings</h1>
          <p style={styles.subtitle}>Backend ki sari settings yahan se control karein — koi restart nahi</p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.refreshBtn} onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? '⏳ Refreshing...' : '🔄 Apply to Server'}
          </button>
          <button style={styles.resetBtn} onClick={handleReset}>
            ↩️ Reset Defaults
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map(cat => {
          const info = CATEGORY_LABELS[cat] || { icon: '⚙️', label: cat };
          return (
            <button
              key={cat}
              style={{ ...styles.tab, ...(activeTab === cat ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(cat)}
            >
              {info.icon} {info.label}
            </button>
          );
        })}
      </div>

      {/* Settings Panel */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <span style={styles.panelTitle}>
            {CATEGORY_LABELS[activeTab]?.icon} {CATEGORY_LABELS[activeTab]?.label}
          </span>
          <span style={styles.panelCount}>{(grouped[activeTab] || []).length} settings</span>
        </div>
        <div style={styles.settingsList}>
          {(grouped[activeTab] || []).map(setting => (
            <SettingInput key={setting.key} setting={setting} onChange={handleChange} />
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div style={styles.infoBanner}>
        <strong>ℹ️ Note:</strong> Rate limit changes turant apply ho jaati hain active rate limiter windows ko affect kiye bina. 
        "Apply to Server" dabao to naye rate limiters create hon. OTP, DDoS, aur boolean settings turant active hoti hain.
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '24px', maxWidth: '900px' },
  loading:   { padding: '40px', textAlign: 'center', color: '#888', fontSize: '16px' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title:     { margin: 0, fontSize: '24px', fontWeight: 700, color: '#2c2c2c' },
  subtitle:  { margin: '4px 0 0', color: '#888', fontSize: '14px' },
  headerActions: { display: 'flex', gap: '10px', alignItems: 'center' },
  refreshBtn: {
    padding: '8px 16px', background: '#27ae60', color: '#fff', border: 'none',
    borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
  },
  resetBtn: {
    padding: '8px 16px', background: '#fff', color: '#c0392b', border: '1.5px solid #c0392b',
    borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
  },
  tabs:     { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' },
  tab:      {
    padding: '8px 16px', border: '1.5px solid #e8e0d8', borderRadius: '20px',
    background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
    color: '#555', transition: 'all 0.2s',
  },
  tabActive: { background: '#c0392b', color: '#fff', borderColor: '#c0392b', fontWeight: 700 },
  panel:     { background: '#fff', borderRadius: '12px', border: '1px solid #e8e0d8', overflow: 'hidden' },
  panelHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 20px', background: '#fdf8f3', borderBottom: '1px solid #e8e0d8',
  },
  panelTitle: { fontWeight: 700, fontSize: '15px', color: '#2c2c2c' },
  panelCount: { fontSize: '12px', color: '#888', background: '#eee', padding: '2px 8px', borderRadius: '10px' },
  settingsList: {},
  settingRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '16px 20px', borderBottom: '1px solid #f0ebe4', gap: '16px', flexWrap: 'wrap',
  },
  settingInfo:  { flex: '1', minWidth: '200px' },
  settingLabel: { fontWeight: 600, fontSize: '14px', color: '#2c2c2c', marginBottom: '2px' },
  settingDesc:  { fontSize: '12px', color: '#888', marginBottom: '4px' },
  settingKey:   { fontSize: '11px', color: '#aaa', fontFamily: 'monospace', background: '#f5f5f5', padding: '1px 6px', borderRadius: '4px', display: 'inline-block' },
  settingControl: { flex: '1', minWidth: '250px' },
  toggle:       { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
  toggleTrack:  { width: '46px', height: '24px', borderRadius: '12px', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' },
  toggleThumb:  { position: 'absolute', top: '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  toggleLabel:  { fontSize: '13px', color: '#555', fontWeight: 500 },
  inputGroup:   { display: 'flex', flexDirection: 'column', gap: '8px' },
  presets:      { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  presetBtn:    {
    padding: '3px 10px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '12px',
    background: '#fff', cursor: 'pointer', color: '#555',
  },
  presetBtnActive: { background: '#c0392b', color: '#fff', borderColor: '#c0392b', fontWeight: 600 },
  inputRow:     { display: 'flex', gap: '8px', alignItems: 'center' },
  input:        {
    padding: '7px 10px', border: '1.5px solid #e0d8cf', borderRadius: '8px',
    fontSize: '13px', width: '130px', outline: 'none',
  },
  inputSuffix:  { fontSize: '12px', color: '#888', whiteSpace: 'nowrap' },
  saveBtn:      {
    padding: '7px 14px', background: '#c0392b', color: '#fff', border: 'none',
    borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '12px',
  },
  infoBanner: {
    marginTop: '20px', padding: '14px 18px', background: '#f0f7ff', border: '1px solid #b3d4f7',
    borderRadius: '10px', fontSize: '13px', color: '#444', lineHeight: '1.6',
  },
};
