import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import SeatGrid from '../../components/SeatGrid';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateUserWallet } = useAuth();

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Reservation state
  const [reservation, setReservation] = useState(null); // { expiresAt, totalAmount }
  const [timeLeft, setTimeLeft] = useState(0);
  const idempotencyKeyRef = useRef(null);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.data.event);
      setSeats(res.data.data.seats);
    } catch (err) {
      toast.error('Event not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  // ── Countdown timer ──
  useEffect(() => {
    if (!reservation) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(reservation.expiresAt) - new Date()) / 1000)
      );
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        toast.error('Reservation expired. Please select seats again.');
        setReservation(null);
        setSelectedSeats([]);
        fetchEvent(); // refresh seat states
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation, fetchEvent]);

  const toggleSeat = (seatId) => {
    if (reservation) return; // can't change selection while reserved

    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((id) => id !== seatId)
        : prev.length < 10
        ? [...prev, seatId]
        : prev // max 10 seats
    );
  };

  // ── Step 1: Reserve seats ──
  const handleReserve = async () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }

    setReserving(true);
    try {
      const res = await api.post('/bookings/reserve', {
        eventId: id,
        seatIds: selectedSeats,
      });

      const { expiresAt, totalAmount, totalAmountFormatted } = res.data.data;
      idempotencyKeyRef.current = uuidv4();

      setReservation({ expiresAt, totalAmount, totalAmountFormatted });
      toast.success('Seats reserved! Complete payment within 5 minutes.');
      fetchEvent(); // refresh to show seats as 'reserved'
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reserve seats');
      fetchEvent();
      setSelectedSeats([]);
    } finally {
      setReserving(false);
    }
  };

  // ── Step 2: Confirm booking (pay) ──
  const handleConfirm = async () => {
    setConfirming(true);
    try {
     await api.post('/bookings/confirm', {
        eventId: id,
        seatIds: selectedSeats,
        idempotencyKey: idempotencyKeyRef.current,
      });

      toast.success('Booking confirmed! 🎉');

      // Refresh wallet balance in navbar
      const balanceRes = await api.get('/wallet/balance');
      updateUserWallet(balanceRes.data.data.balance);

      navigate('/bookings');
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment failed';
      toast.error(msg);

      // If reservation expired during payment, reset everything
      if (msg.toLowerCase().includes('expired')) {
        setReservation(null);
        setSelectedSeats([]);
        fetchEvent();
      }
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedSeats([]);
    setReservation(null);
    fetchEvent();
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-screen">Loading event...</div>
      </>
    );
  }

  const pricePerSeat = event.pricePerSeat;
  const estimatedTotal = pricePerSeat * selectedSeats.length;
  const walletBalance = user?.wallet?.balance || 0;
  const insufficientFunds = reservation
    ? walletBalance < reservation.totalAmount
    : walletBalance < estimatedTotal;

  return (
    <>
      <Navbar />
      <div className="container">
        <div style={{ marginBottom: 20 }}>
          <h2>{event.title}</h2>
          <p style={{ color: '#888' }}>
            📍 {event.venue} &nbsp;|&nbsp; 🗓 {new Date(event.date).toLocaleString()}
          </p>
          <p style={{ color: '#667eea', fontWeight: 700, fontSize: 18, marginTop: 8 }}>
            {event.priceFormatted} per seat
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          {/* Seat Map */}
          <div className="card">
            <SeatGrid
              seats={seats}
              selectedSeats={selectedSeats}
              onToggleSeat={toggleSeat}
            />
          </div>

          {/* Booking Summary Sidebar */}
          <div className="card" style={{ height: 'fit-content', position: 'sticky', top: 20 }}>
            <h3 style={{ marginBottom: 16 }}>Booking Summary</h3>

            {selectedSeats.length === 0 ? (
              <p style={{ color: '#999', fontSize: 14 }}>
                Select seats from the map to begin
              </p>
            ) : (
              <>
                <p style={{ fontSize: 14, marginBottom: 8 }}>
                  Seats:{' '}
                  <strong>
                    {seats
                      .filter((s) => selectedSeats.includes(s._id))
                      .map((s) => s.seatNumber)
                      .join(', ')}
                  </strong>
                </p>
                <p style={{ fontSize: 14, marginBottom: 16 }}>
                  {selectedSeats.length} seat(s) × {event.priceFormatted}
                </p>

                <div
                  style={{
                    borderTop: '1px solid #eee',
                    paddingTop: 12,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18 }}>
                    <span>Total</span>
                    <span style={{ color: '#667eea' }}>
                      {reservation
                        ? reservation.totalAmountFormatted
                        : `₹${(estimatedTotal / 100).toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {reservation && (
                  <div
                    style={{
                      background: timeLeft < 60 ? '#fde8e8' : '#fff8e1',
                      color: timeLeft < 60 ? '#e74c3c' : '#f39c12',
                      padding: '10px 14px',
                      borderRadius: 8,
                      textAlign: 'center',
                      marginBottom: 16,
                      fontWeight: 700,
                    }}
                  >
                    ⏳ Time left: {formatTime(timeLeft)}
                  </div>
                )}

                {insufficientFunds && (
                  <p className="error-text" style={{ marginBottom: 12 }}>
                    Insufficient wallet balance. Please{' '}
                    <a href="/wallet" style={{ color: '#e74c3c', fontWeight: 700 }}>
                      add money
                    </a>{' '}
                    first.
                  </p>
                )}

                {!reservation ? (
                  <button
                    className="btn"
                    onClick={handleReserve}
                    disabled={reserving}
                  >
                    {reserving ? 'Reserving...' : 'Reserve Seats'}
                  </button>
                ) : (
                  <>
                    <button
                      className="btn"
                      onClick={handleConfirm}
                      disabled={confirming || insufficientFunds}
                      style={{ marginBottom: 8 }}
                    >
                      {confirming ? 'Processing payment...' : 'Pay & Confirm Booking'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleCancelSelection}
                      disabled={confirming}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}