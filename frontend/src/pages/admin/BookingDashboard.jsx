import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Navbar from '../../components/Navbar';

export default function BookingDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchBookings = async (pageNum = 1, status = '') => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: pageNum, limit: 10 });
      if (status) query.append('status', status);

      const res = await api.get(`/admin/bookings?${query}`);
      setBookings(res.data.data.bookings);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(page, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const handleCancel = async (bookingId) => {
    const reason = window.prompt('Reason for cancellation:');
    if (reason === null) return; // user clicked cancel on prompt

    setCancellingId(bookingId);
    try {
      const res = await api.post(`/admin/bookings/${bookingId}/cancel`, { reason });
      toast.success(`Cancelled & refunded ${res.data.data.refundAmount}`);
      fetchBookings(page, statusFilter);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setCancellingId(null);
    }
  };

  const statusBadge = (status) => {
    if (status === 'confirmed') return 'badge-success';
    if (status === 'cancelled') return 'badge-danger';
    return 'badge-warning';
  };

  const formatAmount = (paise) => `₹${(paise / 100).toFixed(2)}`;

  return (
    <>
      <Navbar />
      <div className="container">
        <h2 style={{ marginBottom: 4 }}>Booking Dashboard</h2>
        <p style={{ color: '#888', marginBottom: 16 }}>
          Monitor all bookings, cancel and refund when needed
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['', 'confirmed', 'cancelled', 'pending'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: '1px solid #ddd',
                background: statusFilter === status ? '#667eea' : 'white',
                color: statusFilter === status ? 'white' : '#444',
                cursor: 'pointer',
                fontSize: 13,
                textTransform: 'capitalize',
              }}
            >
              {status || 'All'}
            </button>
          ))}
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-screen" style={{ height: 200 }}>Loading...</div>
          ) : bookings.length === 0 ? (
            <div className="empty-state">No bookings found</div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Event</th>
                    <th>Seats</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b._id}>
                      <td>
                        {b.userId?.name}
                        <br />
                        <span style={{ fontSize: 12, color: '#999' }}>{b.userId?.email}</span>
                      </td>
                      <td>{b.eventId?.title || '—'}</td>
                      <td>{b.seatIds?.map((s) => s.seatNumber).join(', ')}</td>
                      <td style={{ fontWeight: 600 }}>{formatAmount(b.totalAmount)}</td>
                      <td>
                        <span className={`badge ${statusBadge(b.status)}`}>{b.status}</span>
                      </td>
                      <td style={{ fontSize: 13 }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                      <td>
                        {b.status === 'confirmed' && (
                          <button
                            className="btn btn-danger"
                            style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
                            onClick={() => handleCancel(b._id)}
                            disabled={cancellingId === b._id}
                          >
                            {cancellingId === b._id ? 'Processing...' : 'Cancel & Refund'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pagination && pagination.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '6px 16px' }}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </button>
                  <span style={{ alignSelf: 'center', fontSize: 14, color: '#666' }}>
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '6px 16px' }}
                    disabled={page >= pagination.pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}