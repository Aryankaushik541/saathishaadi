import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import Header from '../components/Header';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminAPI } from '../utils/api';
import toast from 'react-hot-toast';
import './Dashboard.css';

const COLORS = ['#c0392b', '#e74c3c', '#d4a017', '#f0c040', '#8e44ad', '#3498db', '#27ae60', '#e67e22'];

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="stat-card" style={{ '--accent': color }}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-value">{value ?? <span className="stat-loading">...</span>}</div>
    <div className="stat-label">{label}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
);

export default function Dashboard() {
  const { token } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const d = await adminAPI(token).dashboard();
        setData(d);
      } catch (err) {
        toast.error('Dashboard data load nahi hua');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token]);

  const genderData = data ? [
    { name: 'Male', value: data.maleCnt },
    { name: 'Female', value: data.femaleCnt },
  ] : [];

  const religionData = data?.religionStats?.map(r => ({
    name: r._id || 'Other',
    value: r.count,
  })) || [];

  const districtData = data?.districtStats?.map(d => ({
    name: d._id,
    users: d.count,
  })) || [];

  const proposalData = data ? [
    { name: 'Accepted', value: data.acceptedProposals || 0 },
    { name: 'Pending', value: data.pendingProposals || 0 },
    { name: 'Rejected', value: data.rejectedProposals || 0 },
  ] : [];

  return (
    <div className="page-content">
      <Header title="Dashboard" subtitle="SaathiShaadi ki puri jhalak" />

      <div className="content-body">
        {/* Stat Cards */}
        <div className="stats-grid">
          <StatCard icon="👥" label="Total Users" value={data?.totalUsers} color="#c0392b" sub={`+${data?.newUsersThisWeek ?? '?'} is hafte`} />
          <StatCard icon="✅" label="Active Users" value={data?.activeUsers} color="#27ae60" />
          <StatCard icon="🚫" label="Blocked Users" value={data?.blockedUsers} color="#e74c3c" />
          <StatCard icon="💌" label="Total Proposals" value={data?.totalProposals} color="#d4a017" sub={`${data?.acceptedProposals ?? '?'} accepted`} />
          <StatCard icon="⏳" label="Pending Proposals" value={data?.pendingProposals} color="#e67e22" />
          <StatCard icon="💬" label="Total Messages" value={data?.totalMessages} color="#8e44ad" />
          <StatCard icon="👨" label="Male Users" value={data?.maleCnt} color="#3498db" />
          <StatCard icon="👩" label="Female Users" value={data?.femaleCnt} color="#e91e8c" />
        </div>

        {/* Charts Row 1 */}
        <div className="charts-row">
          {/* Gender Pie */}
          <div className="card chart-card">
            <h3 className="chart-title">Gender Distribution</h3>
            {loading ? (
              <div className="loader-wrap"><div className="spinner" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {genderData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#3498db' : '#e91e8c'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Proposal Status Pie */}
          <div className="card chart-card">
            <h3 className="chart-title">Proposals Status</h3>
            {loading ? (
              <div className="loader-wrap"><div className="spinner" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={proposalData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    <Cell fill="#27ae60" />
                    <Cell fill="#d4a017" />
                    <Cell fill="#e74c3c" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="charts-row">
          {/* Religion Pie */}
          <div className="card chart-card">
            <h3 className="chart-title">Religion Breakdown</h3>
            {loading ? (
              <div className="loader-wrap"><div className="spinner" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={religionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {religionData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* District Bar */}
          <div className="card chart-card">
            <h3 className="chart-title">Top 10 Districts</h3>
            {loading ? (
              <div className="loader-wrap"><div className="spinner" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={districtData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#7a5c52' }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 12, fill: '#7a5c52' }} />
                  <Tooltip contentStyle={{ fontFamily: 'Hind', fontSize: 13 }} />
                  <Bar dataKey="users" fill="#c0392b" radius={[6, 6, 0, 0]}>
                    {districtData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick Summary */}
        <div className="card summary-card">
          <h3 className="chart-title">📋 Quick Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Proposal Success Rate</span>
              <span className="summary-val" style={{ color: '#27ae60' }}>
                {data ? `${((data.acceptedProposals / (data.totalProposals || 1)) * 100).toFixed(1)}%` : '...'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">User Block Rate</span>
              <span className="summary-val" style={{ color: '#e74c3c' }}>
                {data ? `${((data.blockedUsers / (data.totalUsers || 1)) * 100).toFixed(1)}%` : '...'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Naye Users (7 Din)</span>
              <span className="summary-val" style={{ color: '#d4a017' }}>
                {data?.newUsersThisWeek ?? '...'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Avg Msgs Per User</span>
              <span className="summary-val" style={{ color: '#8e44ad' }}>
                {data ? (data.totalMessages / (data.totalUsers || 1)).toFixed(1) : '...'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Pending Proposals</span>
              <span className="summary-val" style={{ color: '#e67e22' }}>
                {data?.pendingProposals ?? '...'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Male : Female Ratio</span>
              <span className="summary-val" style={{ color: '#3498db' }}>
                {data ? `${data.maleCnt} : ${data.femaleCnt}` : '...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
