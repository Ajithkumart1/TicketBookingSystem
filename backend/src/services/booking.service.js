const mongoose = require('mongoose');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const { debitWallet } = require('./wallet.service');

// ─────────────────────────────────────────
// STEP 1 — Reserve Seats (5 min lock)
// ─────────────────────────────────────────
const reserveSeats = async (userId, eventId, seatIds) => {

  // Validate — at least 1 seat
  if (!seatIds || seatIds.length === 0) {
    throw Object.assign(new Error('Please select at least one seat'), {
      statusCode: 400,
    });
  }

  // Max 10 seats per booking
  if (seatIds.length > 10) {
    throw Object.assign(new Error('Cannot book more than 10 seats at once'), {
      statusCode: 400,
    });
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + 5 * 60 * 1000); // now + 5 minutes

  // ── Critical Section ──
  // Try to atomically reserve ALL requested seats
  // Condition: seat must be 'available' OR
  //            seat is 'reserved' but expired (so we can take it over)
  const reserveResults = await Promise.all(
    seatIds.map((seatId) =>
      Seat.findOneAndUpdate(
        {
          _id: seatId,
          eventId,
          $or: [
            { status: 'available' },
            {
              status: 'reserved',
              reservationExpiry: { $lt: now }, // expired reservation
            },
          ],
        },
        {
          $set: {
            status: 'reserved',
            reservedBy: userId,
            reservedAt: now,
            reservationExpiry: expiry,
          },
        },
        { new: true }
      )
    )
  );

  // Check if any seat failed to reserve
  const failedSeats = seatIds.filter((_, i) => !reserveResults[i]);

  if (failedSeats.length > 0) {
    // Rollback — release any seats we just reserved in this request
    const successfulSeats = reserveResults
      .filter(Boolean)
      .map((s) => s._id);

    if (successfulSeats.length > 0) {
      await Seat.updateMany(
        { _id: { $in: successfulSeats }, reservedBy: userId },
        {
          $set: {
            status: 'available',
            reservedBy: null,
            reservedAt: null,
            reservationExpiry: null,
          },
        }
      );
    }

    throw Object.assign(
      new Error(
        `${failedSeats.length} seat(s) are unavailable. Please select different seats.`
      ),
      { statusCode: 409 }
    );
  }

  return {
    reservedSeats: reserveResults,
    expiresAt: expiry,
    expiresIn: '5 minutes',
  };
};

// ─────────────────────────────────────────
// STEP 2 — Confirm Booking (Atomic Payment)
// ─────────────────────────────────────────
const confirmBooking = async (userId, eventId, seatIds, totalAmount, idempotencyKey) => {

  // ── Idempotency Check ──
  // If this exact booking was already confirmed, return it
  const existingBooking = await Booking.findOne({ idempotencyKey });
  if (existingBooking) {
    return {
      alreadyProcessed: true,
      booking: existingBooking,
    };
  }

  const now = new Date();

  // ── Pre-flight Checks (before opening transaction) ──
  // Verify all seats are still reserved by THIS user and not expired
  const seats = await Seat.find({
    _id: { $in: seatIds },
    eventId,
    status: 'reserved',
    reservedBy: userId,
    reservationExpiry: { $gt: now }, // not expired
  });

  if (seats.length !== seatIds.length) {
    // Figure out which seats are the problem
    const validSeatIds = seats.map((s) => s._id.toString());
    const invalidSeats = seatIds.filter(
      (id) => !validSeatIds.includes(id.toString())
    );

    throw Object.assign(
      new Error(
        `${invalidSeats.length} seat(s) reservation has expired or is invalid. Please reserve again.`
      ),
      { statusCode: 400 }
    );
  }

  // ── MongoDB Transaction (Atomic) ──
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Create booking record (pending)
    const [booking] = await Booking.create(
      [
        {
          userId,
          eventId,
          seatIds,
          status: 'pending',
          totalAmount,
          idempotencyKey,
        },
      ],
      { session }
    );

    // 2. Debit wallet — throws if insufficient balance
    await debitWallet(
      userId,
      totalAmount,
      `Booking for event - ${seatIds.length} seat(s)`,
      booking._id,
      session
    );

    // 3. Mark all seats as booked
    await Seat.updateMany(
      { _id: { $in: seatIds } },
      {
        $set: {
          status: 'booked',
          bookedBy: userId,
          bookingId: booking._id,
          // clear reservation fields
          reservedBy: null,
          reservedAt: null,
          reservationExpiry: null,
        },
      },
      { session }
    );

    // 4. Mark booking as confirmed
    booking.status = 'confirmed';
    await booking.save({ session });

    // ── All good — commit everything ──
    await session.commitTransaction();

    return {
      alreadyProcessed: false,
      booking,
    };

  } catch (error) {
    // ── Any failure — rollback everything ──
    await session.abortTransaction();

    // Seats go back to reserved state (they'll auto-expire)
    // Don't force release here — let expiry cron handle it
    // or user can try again within their reservation window

    throw error;
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────
// Get user's booking history
// ─────────────────────────────────────────
const getUserBookings = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    Booking.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('eventId', 'title venue date pricePerSeat')
      .populate('seatIds', 'seatNumber'),
    Booking.countDocuments({ userId }),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
};

// ─────────────────────────────────────────
// Get single booking detail
// ─────────────────────────────────────────
const getBookingById = async (bookingId, userId) => {
  const booking = await Booking.findOne({
    _id: bookingId,
    userId, // users can only see their own bookings
  })
    .populate('eventId', 'title venue date pricePerSeat')
    .populate('seatIds', 'seatNumber status');

  if (!booking) {
    throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  }

  return booking;
};

module.exports = {
  reserveSeats,
  confirmBooking,
  getUserBookings,
  getBookingById,
};