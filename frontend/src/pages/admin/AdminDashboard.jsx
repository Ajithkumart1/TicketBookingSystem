import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Navbar from '../../components/Navbar';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        setStats(res.data.data.stats);
      } catch (err) {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-screen">Loading dashboard...</div>
      </>
    );
  }

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: '#667eea' },
    { label: 'Active Events', value: stats.totalEvents, icon: '🎫', color: '#1abc6b' },
    { label: 'Total Bookings', value: stats.totalBookings, icon: '📋', color: '#f39c12' },
    { label: 'Confirmed', value: stats.confirmedBookings, icon: '✅', color: '#1abc6b' },
    { label: 'Cancelled', value: stats.cancelledBookings, icon: '❌', color: '#e74c3c' },
    { label: 'Total Revenue', value: stats.totalRevenueFormatted, icon: '💰', color: '#667eea' },
  ];

  return (
    <>
      <Navbar />
      <div className="container">
        <h2 style={{ marginBottom: 4 }}>Admin Dashboard</h2>
        <p style={{ color: '#888', marginBottom: 24 }}>
          Overview of your ticket booking platform
        </p>

        <div className="grid">
          {cards.map((card) => (
            <div className="card" key={card.label}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
              <p style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>{card.label}</p>
              <h2 style={{ color: card.color }}>{card.value}</h2>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 32, flexWrap: 'wrap' }}>
          <Link to="/admin/events" className="card" style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 200 }}>
            <h3>Manage Events →</h3>
            <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>
              Create events, manage seats
            </p>
          </Link>
          <Link to="/admin/bookings" className="card" style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 200 }}>
            <h3>View Bookings →</h3>
            <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>
              Monitor, cancel & refund
            </p>
          </Link>
          <Link to="/admin/transactions" className="card" style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 200 }}>
            <h3>Transactions →</h3>
            <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>
              All wallet activity
            </p>
          </Link>
        </div>
      </div>
    </>
  );
}