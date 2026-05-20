// API utility - centralized fetch wrapper

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('adminToken');

const req = async (method, path, body = null, opts = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = { method, headers, ...opts };
  if (body && method !== 'GET') config.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || 'API error');
    err.status = res.status;
    throw err;
  }
  return data;
};

const api = {
  // ── Auth ────────────────────────────────────────────────────────────────
  login: (creds)  => req('POST', '/admin/login', creds),

  // ── Dashboard ────────────────────────────────────────────────────────────
  dashboard: ()   => req('GET', '/admin/dashboard'),

  // ── Users ────────────────────────────────────────────────────────────────
  getUsers:    (params = {}) => req('GET', `/admin/users?${new URLSearchParams(params)}`),
  updateUser:  (id, data)    => req('PUT', `/admin/users/${id}`, data),
  blockUser:   (id)          => req('PUT', `/admin/users/${id}/block`),
  unblockUser: (id)          => req('PUT', `/admin/users/${id}/unblock`),
  deleteUser:  (id)          => req('DELETE', `/admin/users/${id}`),

  // ── Proposals ────────────────────────────────────────────────────────────
  getProposals:       (params = {}) => req('GET', `/admin/proposals?${new URLSearchParams(params)}`),
  updateProposalStatus: (id, status) => req('PUT', `/admin/proposals/${id}/status`, { status }),
  deleteProposal:     (id)          => req('DELETE', `/admin/proposals/${id}`),

  // ── Messages ─────────────────────────────────────────────────────────────
  getMessages:   (params = {}) => req('GET', `/admin/messages?${new URLSearchParams(params)}`),
  deleteMessage: (id)          => req('DELETE', `/admin/messages/${id}`),

  // ── Ads ──────────────────────────────────────────────────────────────────
  getAds:     ()       => req('GET', '/admin/ads'),
  createAd:   (data)   => req('POST', '/admin/ads', data),
  updateAd:   (id, d)  => req('PUT', `/admin/ads/${id}`, d),
  deleteAd:   (id)     => req('DELETE', `/admin/ads/${id}`),
  uploadAdImage: (formData) => {
    const token = getToken();
    return fetch(`${BASE}/admin/ads/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(r => r.json());
  },

  // ── Pages ────────────────────────────────────────────────────────────────
  getPages:    ()         => req('GET', '/admin/pages'),
  createPage:  (data)     => req('POST', '/admin/pages', data),
  updatePage:  (id, data) => req('PUT', `/admin/pages/${id}`, data),
  deletePage:  (id)       => req('DELETE', `/admin/pages/${id}`),

  // ── Settings ─────────────────────────────────────────────────────────────
  getSettings:        (params = {}) => req('GET', `/admin/settings?${new URLSearchParams(params)}`),
  getSettingsGrouped: ()            => req('GET', '/admin/settings/grouped'),
  updateSetting:      (key, value)  => req('PUT', `/admin/settings/${encodeURIComponent(key)}`, { value }),
  bulkUpdateSettings: (settings)   => req('PUT', '/admin/settings', { settings }),
  resetSettings:      ()           => req('POST', '/admin/settings/reset'),

  // ── IP Management ────────────────────────────────────────────────────────
  getIPBlacklist:     (params = {}) => req('GET', `/admin/ip-blacklist?${new URLSearchParams(params)}`),
  addIPBlacklist:     (data)        => req('POST', '/admin/ip-blacklist', data),
  removeIPBlacklist:  (ip)          => req('DELETE', `/admin/ip-blacklist/${encodeURIComponent(ip)}`),
  clearAutoBlocked:   ()            => req('POST', '/admin/ip-blacklist/clear-auto'),
  getSuspiciousIPs:   ()            => req('GET', '/admin/ip-suspicious'),

  // ── Access Logs ──────────────────────────────────────────────────────────
  getAccessLogs:     (params = {}) => req('GET', `/admin/access-logs?${new URLSearchParams(params)}`),
  getIPLogs:         (ip, p = {})  => req('GET', `/admin/access-logs/ip/${encodeURIComponent(ip)}?${new URLSearchParams(p)}`),
  getTopIPs:         (params = {}) => req('GET', `/admin/access-logs/top-ips?${new URLSearchParams(params)}`),
  getAccessLogStats: (params = {}) => req('GET', `/admin/access-logs/stats?${new URLSearchParams(params)}`),
  clearAccessLogs:   (data)        => req('DELETE', '/admin/access-logs', data),

  // ── Call Logs ────────────────────────────────────────────────────────────
  getCallLogs:    (params = {}) => req('GET', `/admin/call-logs?${new URLSearchParams(params)}`),
  updateCallLog:  (id, data)    => req('PUT', `/admin/call-logs/${id}`, data),
  deleteCallLog:  (id)          => req('DELETE', `/admin/call-logs/${id}`),
  clearCallLogs:  (data)        => req('DELETE', '/admin/call-logs', data),

  // ── OTP Logs ─────────────────────────────────────────────────────────────
  getOTPLogs:    (params = {}) => req('GET', `/admin/otp-logs?${new URLSearchParams(params)}`),
  cleanupOTPs:   ()            => req('DELETE', '/admin/otp-logs/cleanup'),
  deleteOTP:     (id)          => req('DELETE', `/admin/otp-logs/${id}`),

  // ── System ───────────────────────────────────────────────────────────────
  getSystemHealth:     ()              => req('GET', '/admin/system/health'),
  refreshSettings:     ()              => req('POST', '/admin/system/refresh-settings'),
  setMaintenanceMode:  (enabled)       => req('POST', '/admin/system/maintenance', { enabled }),
};

export default api;
