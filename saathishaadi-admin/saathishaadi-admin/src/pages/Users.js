import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import adminAPI from '../utils/api';
import toast from 'react-hot-toast';
import '../pages/Dashboard.css';
import './Users.css';

const RELIGIONS = ['', 'Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other'];

const emptyEdit = {
  name: '',
  age: '',
  gender: '',
  religion: '',
  caste: '',
  district: '',
  profession: '',
  bio: ''
};

export default function Users() {
  const api = adminAPI;

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

      const data = await api.getUsers(params);

      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);

    } catch (err) {
      console.error(err);
      toast.error('Users load nahi hue');
    } finally {
      setLoading(false);
    }
  }, [page, search, gender, religion, isBlocked, api]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleBlock = async (id) => {
    try {
      await api.blockUser(id);

      toast.success('User block kar diya');

      loadUsers();

    } catch (err) {
      console.error(err);
      toast.error('Error');
    }
  };

  const handleUnblock = async (id) => {
    try {
      await api.unblockUser(id);

      toast.success('User unblock kar diya');

      loadUsers();

    } catch (err) {
      console.error(err);
      toast.error('Error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteUser(id);

      toast.success('User delete kar diya');

      setDeleteConfirm(null);

      loadUsers();

    } catch (err) {
      console.error(err);
      toast.error('Error');
    }
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
      await api.updateUser(editUser._id, editForm);

      toast.success('User update ho gaya');

      setEditUser(null);

      loadUsers();

    } catch (err) {
      console.error(err);

      toast.error(
        err.response?.data?.message || 'Update error'
      );

    } finally {
      setEditSaving(false);
    }
  };

  const ef = (k) => (e) =>
    setEditForm((prev) => ({
      ...prev,
      [k]: e.target.value
    }));

  return (
    <div className="page-content">

      <Header
        title="Users Management"
        subtitle={`${total} total users`}
      />

      <div className="content-body">

        {/* Filters */}
        <div className="card filters-bar">

          <div className="filters-row">

            <input
              className="input"
              placeholder="🔍 Name ya Email se search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ maxWidth: 280 }}
            />

            <select
              className="input"
              value={gender}
              onChange={(e) => {
                setGender(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <select
              className="input"
              value={religion}
              onChange={(e) => {
                setReligion(e.target.value);
                setPage(1);
              }}
            >
              {RELIGIONS.map((r) => (
                <option key={r} value={r}>
                  {r || 'All Religion'}
                </option>
              ))}
            </select>

            <select
              className="input"
              value={isBlocked}
              onChange={(e) => {
                setIsBlocked(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="false">Active</option>
              <option value="true">Blocked</option>
            </select>

            <button
              className="btn-outline"
              onClick={() => {
                setSearch('');
                setGender('');
                setReligion('');
                setIsBlocked('');
                setPage(1);
              }}
            >
              Reset
            </button>

          </div>

        </div>

        {/* Table */}
        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden'
          }}
        >

          <div className="table-header-bar">
            <span>{total} Users</span>

            <button
              className="btn-primary btn-sm"
              onClick={loadUsers}
            >
              🔄 Refresh
            </button>
          </div>

          <div className="table-wrap">

            {loading ? (

              <div className="loader-wrap">
                <div className="spinner" />
              </div>

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

                    <tr>
                      <td
                        colSpan={11}
                        style={{
                          textAlign: 'center',
                          padding: 40,
                          color: 'var(--text-muted)'
                        }}
                      >
                        Koi user nahi mila
                      </td>
                    </tr>

                  ) : (

                    users.map((u, i) => (

                      <tr key={u._id}>

                        <td>
                          {(page - 1) * 20 + i + 1}
                        </td>

                        <td>{u.name}</td>

                        <td>{u.email}</td>

                        <td>{u.age}</td>

                        <td>{u.gender}</td>

                        <td>{u.religion}</td>

                        <td>{u.district || '-'}</td>

                        <td>
                          {u.isEmailVerified
                            ? '✅ Verified'
                            : '⏳ Pending'}
                        </td>

                        <td>
                          {u.isBlocked
                            ? '🚫 Blocked'
                            : '✅ Active'}
                        </td>

                        <td>
                          {new Date(
                            u.createdAt
                          ).toLocaleDateString('hi-IN')}
                        </td>

                        <td>

                          <div className="action-btns">

                            <button
                              className="btn-outline btn-sm"
                              onClick={() => setSelectedUser(u)}
                            >
                              👁️
                            </button>

                            <button
                              className="btn-outline btn-sm"
                              onClick={() => openEdit(u)}
                            >
                              ✏️
                            </button>

                            {u.isBlocked ? (

                              <button
                                className="btn-success btn-sm"
                                onClick={() =>
                                  handleUnblock(u._id)
                                }
                              >
                                Unblock
                              </button>

                            ) : (

                              <button
                                className="btn-danger btn-sm"
                                onClick={() =>
                                  handleBlock(u._id)
                                }
                              >
                                Block
                              </button>

                            )}

                            <button
                              className="btn-danger btn-sm"
                              onClick={() =>
                                setDeleteConfirm(u)
                              }
                            >
                              🗑️
                            </button>

                          </div>

                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            )}

          </div>

        </div>

      </div>

    </div>
  );
}
