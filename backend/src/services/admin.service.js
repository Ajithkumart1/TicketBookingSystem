const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const { refundWallet } = require('./wallet.service');

// ─────────────────────────────────────────
// Cancel booking + refund wallet (atomic)
// ─────────────────────────────────────────
const cancelBookingAndRefund = async (bookingId, reason, adminId) => {

  // Find booking
  const booking = await Booking.findById(bookingId)
    .populate('eventId', 'title')
    .populate('userId', 'name email');

  if (!booking) {
    throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  }

  if (booking.status === 'cancelled') {
    throw Object.assign(new Error('Booking is already cancelled'), {
      statusCode: 409,
    });
  }

  if (booking.status !== 'confirmed') {
    throw Object.assign(
      new Error('Only confirmed bookings can be cancelled'),
      { statusCode: 400 }
    );
  }

  // ── MongoDB Transaction ──
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Refund wallet
    const { transaction: refundTx } = await refundWallet(
      booking.userId._id,
      booking.totalAmount,
      `Refund for booking cancellation - ${booking.eventId.title}`,
      booking._id,
      session
    );

    // 2. Release seats back to available
    await Seat.updateMany(
      { bookingId: booking._id },
      {
        $set: {
          status: 'available',
          bookedBy: null,
          bookingId: null,
          reservedBy: null,
          reservedAt: null,
          reservationExpiry: null,
        },
      },
      { session }
    );

    // 3. Update booking status
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || 'Cancelled by admin';
    booking.refundTransactionId = refundTx._id;
    await booking.save({ session });

    await session.commitTransaction();

    return { booking, refundTransaction: refundTx };

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────
// Get all bookings with filters
// ─────────────────────────────────────────
const getAllBookings = async (filters = {}, page = 1, limit = 10) => {
  const query = {};

  // Filter by status
  if (filters.status) {
    query.status = filters.status;
  }

  // Filter by eventId
  if (filters.eventId) {
    query.eventId = filters.eventId;
  }

  // Filter by userId
  if (filters.userId) {
    query.userId = filters.userId;
  }

  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('eventId', 'title venue date')
      .populate('seatIds', 'seatNumber'),
    Booking.countDocuments(query),
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
// Get all wallet transactions (admin view)
// ─────────────────────────────────────────
const getAllTransactions = async (filters = {}, page = 1, limit = 10) => {
  const Transaction = require('../models/Transaction');
  const query = {};

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.userId) {
    query.userId = filters.userId;
  }

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('bookingId', 'status totalAmount'),
    Transaction.countDocuments(query),
  ]);

  return {
    transactions,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
};

// ─────────────────────────────────────────
// Dashboard stats for admin home
// ─────────────────────────────────────────
const getDashboardStats = async () => {
  const Booking = require('../models/Booking');
  const Transaction = require('../models/Transaction');
  const User = require('../models/User');
  const Event = require('../models/Event');

  const [
    totalUsers,
    totalEvents,
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    revenueResult,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Event.countDocuments({ isActive: true }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'confirmed' }),
    Booking.countDocuments({ status: 'cancelled' }),
    Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
  ]);

  const totalRevenue = revenueResult[0]?.total || 0;

  return {
    totalUsers,
    totalEvents,
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    totalRevenue,
    totalRevenueFormatted: `₹${(totalRevenue / 100).toFixed(2)}`,
  };
};

module.exports = {
  cancelBookingAndRefund,
  getAllBookings,
  getAllTransactions,
  getDashboardStats,
};