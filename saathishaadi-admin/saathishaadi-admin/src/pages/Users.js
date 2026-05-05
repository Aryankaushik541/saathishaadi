import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminAPI } from '../utils/api';
import toast from 'react-hot-toast';
import '../pages/Dashboard.css';
import './Users.css';

const RELIGIONS = ['', 'Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other'];

const emptyEdit = { name: '', age: '', gender: '', religion: '', caste: '', district: '', profession: '', bio: '' };

export default function Users() {
  const { token } = useAdminAuth();
  const api = adminAPI(token);

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [religion, setReligion] = useState('');
  const [isBlocked, setIsBlocked] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', 20);
      if (search) params.set('search', search);
      if (gender) params.set('gender', gender);
      if (religion) params.set('religion', religion);
      if (isBlocked !== '') params.set('isBlocked', isBlocked);
      const data = await api.getUsers('?' + params.toString());
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error('Users load nahi hue');
    } finally {
      setLoading(false);
    }
  }, [token, page, search, gender, religion, isBlocked]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleBlock = async (id) => {
    try {
      await api.blockUser(id);
      toast.success('User block kar diya');
      loadUsers();
    } catch { toast.error('Error'); }
  };

  const handleUnblock = async (id) => {
    try {
      await api.unblockUser(id);
      toast.success('User unblock kar diya');
      loadUsers();
    } catch { toast.error('Error'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteUser(id);
      toast.success('User delete kar diya');
      setDeleteConfirm(null);
      loadUsers();
    } catch { toast.error('Error'); }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      name: u.name || '',
      age: u.age || '',
      gender: u.gender || '',
      religion: u.religion || '',
      caste: u.caste || '',
      district: u.district || '',
      profession: u.profession || '',
      bio: u.bio || '',
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await api.editUser(editUser._id, editForm);
      toast.success('User update ho gaya');
      setEditUser(null);
      loadUsers();
    } catch (err) {
      toast.error(err.message || 'Update error');
    } finally {
      setEditSaving(false);
    }
  };

  const ef = (k) => (e) => setEditForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="page-content">
      <Header title="Users Management" subtitle={`${total} total users`} />

      <div className="content-body">
        {/* Filters */}
        <div className="card filters-bar">
          <div className="filters-row">
            <input
              className="input" placeholder="🔍 Name ya Email se search..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ maxWidth: 280 }}
            />
            <select className="input" value={gender} onChange={e => { setGender(e.target.value); setPage(1); }}>
              <option value="">All Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <select className="input" value={religion} onChange={e => { setReligion(e.target.value); setPage(1); }}>
              {RELIGIONS.map(r => <option key={r} value={r}>{r || 'All Religion'}</option>)}
            </select>
            <select className="input" value={isBlocked} onChange={e => { setIsBlocked(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="false">Active</option>
              <option value="true">Blocked</option>
            </select>
            <button className="btn-outline" onClick={() => { setSearch(''); setGender(''); setReligion(''); setIsBlocked(''); setPage(1); }}>
              Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-header-bar">
            <span>{total} Users</span>
            <button className="btn-primary btn-sm" onClick={loadUsers}>🔄 Refresh</button>
          </div>
          <div className="table-wrap">
            {loading ? (
              <div className="loader-wrap"><div className="spinner" /></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Religion</th>
                    <th>District</th>
                    <th>Email Verified</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Koi user nahi mila</td></tr>
                  ) : users.map((u, i) => (
                    <tr key={u._id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page - 1) * 20 + i + 1}</td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-placeholder">{u.name?.[0]?.toUpperCase()}</div>
                          <span className="user-name">{u.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                      <td>{u.age}</td>
                      <td>
                        <span className={`badge ${u.gender === 'Male' ? 'badge-blue' : 'badge-red'}`}>
                          {u.gender === 'Male' ? '👨' : '👩'} {u.gender}
                        </span>
                      </td>
                      <td>{u.religion}</td>
                      <td>{u.district || '-'}</td>
                      <td>
                        {u.isEmailVerified
                          ? <span className="badge badge-green">✅ Verified</span>
                          : <span className="badge badge-gold">⏳ Pending</span>
                        }
                      </td>
                      <td>
                        {u.isBlocked
                          ? <span className="badge badge-red">🚫 Blocked</span>
                          : <span className="badge badge-green">✅ Active</span>
                        }
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString('hi-IN')}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-outline btn-sm" onClick={() => setSelectedUser(u)} title="View Details">👁️</button>
                          <button className="btn-outline btn-sm" onClick={() => openEdit(u)} title="Edit User">✏️</button>
                          {u.isBlocked
                            ? <button className="btn-success btn-sm" onClick={() => handleUnblock(u._id)}>Unblock</button>
                            : <button className="btn-danger btn-sm" onClick={() => handleBlock(u._id)}>Block</button>
                          }
                          <button className="btn-danger btn-sm" onClick={() => setDeleteConfirm(u)} title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
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

      {/* View Detail Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>👤 User Details</h3>
            <div className="user-detail-grid">
              <div className="user-detail-avatar">{selectedUser.name?.[0]?.toUpperCase()}</div>
              <div className="user-detail-info">
                <h4>{selectedUser.name}</h4>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedUser.email}</p>
              </div>
            </div>
            <div className="detail-list">
              {[
                ['Age', selectedUser.age],
                ['Gender', selectedUser.gender],
                ['Religion', selectedUser.religion],
                ['Caste', selectedUser.caste || '-'],
                ['District', selectedUser.district || '-'],
                ['Profession', selectedUser.profession || '-'],
                ['Email Verified', selectedUser.isEmailVerified ? '✅ Verified' : '⏳ Pending'],
                ['Account Status', selectedUser.isBlocked ? '🚫 Blocked' : '✅ Active'],
                ['Last Seen', selectedUser.lastSeen ? new Date(selectedUser.lastSeen).toLocaleString('hi-IN') : '-'],
                ['Joined', new Date(selectedUser.createdAt).toLocaleDateString('hi-IN', { year: 'numeric', month: 'long', day: 'numeric' })],
              ].map(([k, v]) => (
                <div key={k} className="detail-row">
                  <span className="detail-key">{k}</span>
                  <span className="detail-val">{v}</span>
                </div>
              ))}
            </div>
            {selectedUser.bio && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--cream)', borderRadius: 10, fontSize: 14 }}>
                <strong>Bio:</strong> {selectedUser.bio}
              </div>
            )}
            {selectedUser.photo && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <img src={selectedUser.photo} alt="Profile" style={{ maxWidth: 120, borderRadius: 10, border: '2px solid var(--border)' }} onError={e => e.target.style.display = 'none'} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {selectedUser.isBlocked
                ? <button className="btn-success" onClick={() => { handleUnblock(selectedUser._id); setSelectedUser(null); }}>✅ Unblock</button>
                : <button className="btn-danger" onClick={() => { handleBlock(selectedUser._id); setSelectedUser(null); }}>🚫 Block</button>
              }
              <button className="btn-outline" onClick={() => { openEdit(selectedUser); setSelectedUser(null); }}>✏️ Edit</button>
              <button className="btn-outline" onClick={() => setSelectedUser(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3>✏️ User Edit: {editUser.name}</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{editUser.email}</p>
            <form onSubmit={handleEditSave}>
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input className="input" value={editForm.name} onChange={ef('name')} required />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input className="input" type="number" min="18" max="65" value={editForm.age} onChange={ef('age')} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Gender</label>
                  <select className="input" value={editForm.gender} onChange={ef('gender')} required>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Religion</label>
                  <input className="input" value={editForm.religion} onChange={ef('religion')} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Caste</label>
                  <input className="input" value={editForm.caste} onChange={ef('caste')} />
                </div>
                <div className="form-group">
                  <label>District</label>
                  <input className="input" value={editForm.district} onChange={ef('district')} />
                </div>
              </div>
              <div className="form-group">
                <label>Profession</label>
                <input className="input" value={editForm.profession} onChange={ef('profession')} />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea className="input" rows={3} value={editForm.bio} onChange={ef('bio')} maxLength={500} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{editForm.bio?.length || 0}/500</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn-primary" type="submit" disabled={editSaving}>
                  {editSaving ? 'Save ho raha...' : '💾 Save Changes'}
                </button>
                <button className="btn-outline" type="button" onClick={() => setEditUser(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>⚠️ Delete Confirm</h3>
            <p style={{ marginBottom: 20, color: 'var(--text-muted)' }}>
              Kya aap sach mein <strong>{deleteConfirm.name}</strong> ko delete karna chahte hain?
              Yeh action undo nahi ho sakta. Unke saare proposals aur messages bhi delete ho jayenge.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm._id)}>🗑️ Haan, Delete Karo</button>
              <button className="btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
