const Event = require('../models/Event');
const Seat = require('../models/Seat');

// ─────────────────────────────────────────
// @route   GET /api/events
// @access  Public
// ─────────────────────────────────────────
const getAllEvents = async (req, res) => {
  const events = await Event.find({ isActive: true })
    .sort({ date: 1 })
    .select('-__v');

  // For each event, attach available seat count
  const eventsWithCount = await Promise.all(
    events.map(async (event) => {
      const availableSeats = await Seat.countDocuments({
        eventId: event._id,
        status: 'available',
      });
      return {
        ...event.toObject(),
        availableSeats,
        priceFormatted: `₹${(event.pricePerSeat / 100).toFixed(2)}`,
      };
    })
  );

  res.json({
    success: true,
    data: { events: eventsWithCount },
  });
};

// ─────────────────────────────────────────
// @route   GET /api/events/:id
// @access  Public
// ─────────────────────────────────────────
const getEventById = async (req, res) => {
  const event = await Event.findById(req.params.id).select('-__v');

  if (!event || !event.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Get all seats for this event
  const seats = await Seat.find({ eventId: event._id })
    .select('seatNumber status reservationExpiry')
    .sort({ seatNumber: 1 });

  // Seat summary counts
  const summary = {
    total: seats.length,
    available: seats.filter((s) => s.status === 'available').length,
    reserved: seats.filter((s) => s.status === 'reserved').length,
    booked: seats.filter((s) => s.status === 'booked').length,
  };

  res.json({
    success: true,
    data: {
      event: {
        ...event.toObject(),
        priceFormatted: `₹${(event.pricePerSeat / 100).toFixed(2)}`,
      },
      seats,
      summary,
    },
  });
};

// ─────────────────────────────────────────
// @route   POST /api/admin/events
// @access  Admin
// ─────────────────────────────────────────
const createEvent = async (req, res) => {
  const { title, description, venue, date, pricePerSeat, totalSeats } = req.body;

  if (!title || !venue || !date || !pricePerSeat || !totalSeats) {
    return res.status(400).json({
      success: false,
      message: 'Please provide title, venue, date, pricePerSeat and totalSeats',
    });
  }

  if (new Date(date) < new Date()) {
    return res.status(400).json({
      success: false,
      message: 'Event date must be in the future',
    });
  }

  // pricePerSeat comes in rupees from frontend → convert to paise
  const priceInPaise = Math.round(pricePerSeat * 100);

  const event = await Event.create({
    title,
    description,
    venue,
    date,
    pricePerSeat: priceInPaise,
    totalSeats,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: { event },
  });
};

// ─────────────────────────────────────────
// @route   PUT /api/admin/events/:id
// @access  Admin
// ─────────────────────────────────────────
const updateEvent = async (req, res) => {
  const { title, description, venue, date, pricePerSeat, isActive } = req.body;

  const event = await Event.findById(req.params.id);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Only update fields that were sent
  if (title) event.title = title;
  if (description !== undefined) event.description = description;
  if (venue) event.venue = venue;
  if (date) event.date = date;
  if (pricePerSeat) event.pricePerSeat = Math.round(pricePerSeat * 100);
  if (isActive !== undefined) event.isActive = isActive;

  await event.save();

  res.json({
    success: true,
    message: 'Event updated successfully',
    data: { event },
  });
};

// ─────────────────────────────────────────
// @route   DELETE /api/admin/events/:id
// @access  Admin
// ─────────────────────────────────────────
const deleteEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Soft delete — just mark inactive
  // never hard delete events that have bookings
  event.isActive = false;
  await event.save();

  res.json({
    success: true,
    message: 'Event deactivated successfully',
  });
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
};