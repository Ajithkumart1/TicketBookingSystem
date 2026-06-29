const Seat = require('../models/Seat');
const Event = require('../models/Event');

// ─────────────────────────────────────────
// @route   POST /api/admin/events/:id/seats
// @access  Admin
// Bulk create seats for an event
// ─────────────────────────────────────────
const bulkCreateSeats = async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Check if seats already exist for this event
  const existingSeats = await Seat.countDocuments({ eventId: event._id });
  if (existingSeats > 0) {
    return res.status(409).json({
      success: false,
      message: `Seats already created for this event (${existingSeats} seats exist)`,
    });
  }

  // Generate seats like A1, A2... B1, B2...
  // Rows: A-Z, Columns: 1 to seatsPerRow
  const seats = [];
  const totalSeats = event.totalSeats;
  const seatsPerRow = 10;
  const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let count = 0;
  let rowIndex = 0;

  while (count < totalSeats) {
    const row = rows[rowIndex];
    for (let col = 1; col <= seatsPerRow && count < totalSeats; col++) {
      seats.push({
        eventId: event._id,
        seatNumber: `${row}${col}`,
        status: 'available',
      });
      count++;
    }
    rowIndex++;
  }

  await Seat.insertMany(seats);

  res.status(201).json({
    success: true,
    message: `${seats.length} seats created successfully`,
    data: {
      totalCreated: seats.length,
      preview: seats.slice(0, 5).map((s) => s.seatNumber),
    },
  });
};

// ─────────────────────────────────────────
// @route   GET /api/admin/events/:id/seats
// @access  Admin
// Full seat state view for admin
// ─────────────────────────────────────────
const getSeatsAdmin = async (req, res) => {
  const seats = await Seat.find({ eventId: req.params.id })
    .populate('reservedBy', 'name email')
    .populate('bookedBy', 'name email')
    .sort({ seatNumber: 1 });

  const summary = {
    total: seats.length,
    available: seats.filter((s) => s.status === 'available').length,
    reserved: seats.filter((s) => s.status === 'reserved').length,
    booked: seats.filter((s) => s.status === 'booked').length,
  };

  res.json({
    success: true,
    data: { seats, summary },
  });
};

module.exports = { bulkCreateSeats, getSeatsAdmin };