const adminService = require('../services/admin.service');

// ─────────────────────────────────────────
// @route   GET /api/admin/dashboard
// @access  Admin
// ─────────────────────────────────────────
const getDashboard = async (req, res) => {
  const stats = await adminService.getDashboardStats();

  res.json({
    success: true,
    data: { stats },
  });
};

// ─────────────────────────────────────────
// @route   GET /api/admin/bookings
// @access  Admin
// Query params: status, eventId, userId, page, limit
// ─────────────────────────────────────────
const getAllBookings = async (req, res) => {
  const { status, eventId, userId, page, limit } = req.query;

  const result = await adminService.getAllBookings(
    { status, eventId, userId },
    parseInt(page) || 1,
    parseInt(limit) || 10
  );

  res.json({
    success: true,
    data: result,
  });
};

// ─────────────────────────────────────────
// @route   POST /api/admin/bookings/:id/cancel
// @access  Admin
// ─────────────────────────────────────────
const cancelBooking = async (req, res) => {
  const { reason } = req.body;
  const { id } = req.params;

  const result = await adminService.cancelBookingAndRefund(
    id,
    reason,
    req.user._id
  );

  res.json({
    success: true,
    message: 'Booking cancelled and refund processed successfully',
    data: {
      booking: result.booking,
      refundTransaction: result.refundTransaction,
      refundAmount: `₹${(result.booking.totalAmount / 100).toFixed(2)}`,
    },
  });
};

// ─────────────────────────────────────────
// @route   GET /api/admin/transactions
// @access  Admin
// Query params: type, userId, page, limit
// ─────────────────────────────────────────
const getAllTransactions = async (req, res) => {
  const { type, userId, page, limit } = req.query;

  const result = await adminService.getAllTransactions(
    { type, userId },
    parseInt(page) || 1,
    parseInt(limit) || 10
  );

  res.json({
    success: true,
    data: result,
  });
};

module.exports = {
  getDashboard,
  getAllBookings,
  cancelBooking,
  getAllTransactions,
};