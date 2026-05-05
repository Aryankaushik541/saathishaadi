const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api = async (endpoint, options = {}, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, { headers, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API Error');
  return data;
};

export const adminAPI = (token) => ({
  // Auth
  login: (creds) => api('/admin/login', { method: 'POST', body: JSON.stringify(creds) }),

  // Dashboard
  dashboard: () => api('/admin/dashboard', {}, token),

  // Users
  getUsers: (params = '') => api(`/admin/users${params}`, {}, token),
  editUser: (id, data) => api(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  blockUser: (id) => api(`/admin/users/${id}/block`, { method: 'PUT' }, token),
  unblockUser: (id) => api(`/admin/users/${id}/unblock`, { method: 'PUT' }, token),
  deleteUser: (id) => api(`/admin/users/${id}`, { method: 'DELETE' }, token),

  // Proposals
  getProposals: (params = '') => api(`/admin/proposals${params}`, {}, token),
  updateProposalStatus: (id, status) => api(`/admin/proposals/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }, token),
  deleteProposal: (id) => api(`/admin/proposals/${id}`, { method: 'DELETE' }, token),

  // Messages
  getMessages: (params = '') => api(`/admin/messages${params}`, {}, token),
  deleteMessage: (id) => api(`/admin/messages/${id}`, { method: 'DELETE' }, token),

  // Ads
  getAds: () => api('/admin/ads', {}, token),
  createAd: (data) => api('/admin/ads', { method: 'POST', body: JSON.stringify(data) }, token),
  updateAd: (id, data) => api(`/admin/ads/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  deleteAd: (id) => api(`/admin/ads/${id}`, { method: 'DELETE' }, token),
});
