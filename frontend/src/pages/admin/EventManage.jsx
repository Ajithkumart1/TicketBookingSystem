import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Navbar from '../../components/Navbar';

export default function EventManage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [seedingSeats, setSeedingSeats] = useState(null); // eventId currently seeding

  const [form, setForm] = useState({
    title: '',
    description: '',
    venue: '',
    date: '',
    pricePerSeat: '',
    totalSeats: '',
  });

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

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/admin/events', {
        ...form,
        pricePerSeat: parseFloat(form.pricePerSeat),
        totalSeats: parseInt(form.totalSeats),
      });
      toast.success('Event created successfully');
      setForm({ title: '', description: '', venue: '', date: '', pricePerSeat: '', totalSeats: '' });
      setShowForm(false);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateSeats = async (eventId) => {
    setSeedingSeats(eventId);
    try {
      const res = await api.post(`/admin/events/${eventId}/seats`);
      toast.success(res.data.message);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate seats');
    } finally {
      setSeedingSeats(null);
    }
  };

  const handleDeactivate = async (eventId) => {
    if (!window.confirm('Deactivate this event? It will no longer be visible to users.')) return;

    try {
      await api.delete(`/admin/events/${eventId}`);
      toast.success('Event deactivated');
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate event');
    }
  };

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2>Event Management</h2>
            <p style={{ color: '#888' }}>Create and manage events</p>
          </div>
          <button className="btn" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Event'}
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Create New Event</h3>
            <form onSubmit={handleCreateEvent}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Event Title</label>
                  <input name="title" value={form.title} onChange={handleChange} required placeholder="IPL Final 2026" />
                </div>
                <div className="form-group">
                  <label>Venue</label>
                  <input name="venue" value={form.venue} onChange={handleChange} required placeholder="Wankhede Stadium" />
                </div>
                <div className="form-group">
                  <label>Date & Time</label>
                  <input type="datetime-local" name="date" value={form.date} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Price per Seat (₹)</label>
                  <input type="number" name="pricePerSeat" value={form.pricePerSeat} onChange={handleChange} required min="1" placeholder="500" />
                </div>
                <div className="form-group">
                  <label>Total Seats</label>
                  <input type="number" name="totalSeats" value={form.totalSeats} onChange={handleChange} required min="1" placeholder="100" />
                </div>
                <div className="form-group">
                  <label>Description (optional)</label>
                  <input name="description" value={form.description} onChange={handleChange} placeholder="Brief description" />
                </div>
              </div>
              <button className="btn" type="submit" disabled={submitting} style={{ marginTop: 8 }}>
                {submitting ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>
        )}

        <div className="grid">
          {events.map((event) => (
            <div className="card" key={event._id}>
              <h3 style={{ marginBottom: 8 }}>{event.title}</h3>
              <p style={{ color: '#888', fontSize: 14, marginBottom: 4 }}>📍 {event.venue}</p>
              <p style={{ color: '#888', fontSize: 14, marginBottom: 4 }}>
                🗓 {new Date(event.date).toLocaleString()}
              </p>
              <p style={{ fontWeight: 700, color: '#667eea', marginBottom: 12 }}>
                {event.priceFormatted} / seat
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="badge badge-info">
                  {event.availableSeats} / {event.totalSeats} available
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {event.availableSeats === 0 && event.totalSeats > 0 ? null : null}
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '8px', fontSize: 13 }}
                  onClick={() => handleGenerateSeats(event._id)}
                  disabled={seedingSeats === event._id}
                >
                  {seedingSeats === event._id ? 'Generating...' : 'Generate Seats'}
                </button>
                <button
                  className="btn btn-danger"
                  style={{ flex: 1, padding: '8px', fontSize: 13 }}
                  onClick={() => handleDeactivate(event._id)}
                >
                  Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}