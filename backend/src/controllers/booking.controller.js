const { v4: uuidv4 } = require('uuid');
const Event = require('../models/Event');
const bookingService = require('../services/booking.service');

// ─────────────────────────────────────────
// @route   POST /api/bookings/reserve
// @access  Private
// ─────────────────────────────────────────
const reserveSeats = async (req, res) => {
  const { eventId, seatIds } = req.body;

  if (!eventId || !seatIds || !Array.isArray(seatIds)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide eventId and seatIds array',
    });
  }

  // Check event exists and is active
  const event = await Event.findById(eventId);
  if (!event || !event.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Check event hasn't passed
  if (new Date(event.date) < new Date()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot book seats for a past event',
    });
  }

  const result = await bookingService.reserveSeats(
    req.user._id,
    eventId,
    seatIds
  );

  res.status(200).json({
    success: true,
    message: 'Seats reserved successfully. You have 5 minutes to complete payment.',
    data: {
      reservedSeats: result.reservedSeats.map((s) => ({
        _id: s._id,
        seatNumber: s.seatNumber,
        status: s.status,
      })),
      expiresAt: result.expiresAt,
      expiresIn: result.expiresIn,
      totalAmount: event.pricePerSeat * seatIds.length,
      totalAmountFormatted: `₹${((event.pricePerSeat * seatIds.length) / 100).toFixed(2)}`,
    },
  });
};

// ─────────────────────────────────────────
// @route   POST /api/bookings/confirm
// @access  Private
// ─────────────────────────────────────────
const confirmBooking = async (req, res) => {
  const { eventId, seatIds, idempotencyKey } = req.body;

  if (!eventId || !seatIds || !Array.isArray(seatIds)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide eventId and seatIds',
    });
  }

  // Generate idempotency key if client didn't send one
  const key = idempotencyKey || uuidv4();

  // Calculate total amount
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  const totalAmount = event.pricePerSeat * seatIds.length;

  const result = await bookingService.confirmBooking(
    req.user._id,
    eventId,
    seatIds,
    totalAmount,
    key
  );

  if (result.alreadyProcessed) {
    return res.status(200).json({
      success: true,
      message: 'Booking already confirmed (idempotent)',
      data: { booking: result.booking },
    });
  }

  res.status(201).json({
    success: true,
    message: 'Booking confirmed successfully!',
    data: {
      booking: result.booking,
    },
  });
};

// ─────────────────────────────────────────
// @route   GET /api/bookings/my
// @access  Private
// ─────────────────────────────────────────
const getMyBookings = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await bookingService.getUserBookings(
    req.user._id,
    page,
    limit
  );

  res.json({
    success: true,
    data: result,
  });
};

// ─────────────────────────────────────────
// @route   GET /api/bookings/:id
// @access  Private
// ─────────────────────────────────────────
const getBookingById = async (req, res) => {
  const booking = await bookingService.getBookingById(
    req.params.id,
    req.user._id
  );

  res.json({
    success: true,
    data: { booking },
  });
};

module.exports = {
  reserveSeats,
  confirmBooking,
  getMyBookings,
  getBookingById,
};