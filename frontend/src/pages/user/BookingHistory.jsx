import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Navbar from '../../components/Navbar';

export default function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchBookings = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/bookings/my?page=${pageNum}&limit=10`);
      setBookings(res.data.data.bookings);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const statusBadge = (status) => {
    if (status === 'confirmed') return 'badge-success';
    if (status === 'cancelled') return 'badge-danger';
    return 'badge-warning'; // pending
  };

  const formatAmount = (paise) => `₹${(paise / 100).toFixed(2)}`;

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-screen">Loading bookings...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <h2 style={{ marginBottom: 4 }}>My Bookings</h2>
        <p style={{ color: '#888', marginBottom: 24 }}>
          View all your event bookings and their status
        </p>

        {bookings.length === 0 ? (
          <div className="empty-state">
            <p>You haven't booked any events yet.</p>
            <a href="/" style={{ color: '#667eea', fontWeight: 600 }}>
              Browse events →
            </a>
          </div>
        ) : (
          <>
            <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
              {bookings.map((booking) => (
                <div className="card" key={booking._id}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <h3 style={{ marginBottom: 4 }}>
                        {booking.eventId?.title || 'Event unavailable'}
                      </h3>
                      <p style={{ color: '#888', fontSize: 14 }}>
                        📍 {booking.eventId?.venue}
                      </p>
                      <p style={{ color: '#888', fontSize: 14 }}>
                        🗓{' '}
                        {booking.eventId?.date
                          ? new Date(booking.eventId.date).toLocaleString()
                          : '—'}
                      </p>
                    </div>
                    <span className={`badge ${statusBadge(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid #eee',
                      paddingTop: 12,
                      marginTop: 12,
                    }}
                  >
                    <div style={{ fontSize: 14 }}>
                      <strong>Seats:</strong>{' '}
                      {booking.seatIds?.map((s) => s.seatNumber).join(', ') || '—'}
                    </div>
                    <div style={{ fontWeight: 700, color: '#667eea', fontSize: 16 }}>
                      {formatAmount(booking.totalAmount)}
                    </div>
                  </div>

                  <p style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>
                    Booked on {new Date(booking.createdAt).toLocaleString()}
                  </p>

                  {booking.status === 'cancelled' && booking.cancellationReason && (
                    <p
                      style={{
                        fontSize: 13,
                        color: '#e74c3c',
                        marginTop: 8,
                        background: '#fde8e8',
                        padding: '8px 12px',
                        borderRadius: 6,
                      }}
                    >
                      Cancelled: {booking.cancellationReason}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {pagination && pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
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
    </>
  );
}