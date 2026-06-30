import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Navbar from '../../components/Navbar';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get('/events');
        setEvents(res.data.data.events);
      } catch (err) {
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-screen">Loading events...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <h2 style={{ marginBottom: 4 }}>Upcoming Events</h2>
        <p style={{ color: '#888', marginBottom: 8 }}>
          Browse and book seats for your favorite events
        </p>

        {events.length === 0 ? (
          <div className="empty-state">No events available right now</div>
        ) : (
          <div className="grid">
            {events.map((event) => (
              <Link
                to={`/events/${event._id}`}
                key={event._id}
                className="card"
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <h3 style={{ marginBottom: 8 }}>{event.title}</h3>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 4 }}>
                  📍 {event.venue}
                </p>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 12 }}>
                  🗓 {new Date(event.date).toLocaleString()}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#667eea', fontSize: 18 }}>
                    {event.priceFormatted}
                  </span>
                  <span
                    className={`badge ${
                      event.availableSeats > 0 ? 'badge-success' : 'badge-danger'
                    }`}
                  >
                    {event.availableSeats > 0
                      ? `${event.availableSeats} seats left`
                      : 'Sold out'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}