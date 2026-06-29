const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    seatIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seat',
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
      // stored in paise (₹1 = 100 paise)
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      // prevents duplicate booking on retry/network failure
      // client generates a UUID and sends it with every booking request
      // if same key hits again, we return the original booking
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    refundTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
      // filled when admin refunds this booking
    },
  },
  { timestamps: true }
);

// Virtual — total amount in rupees for display
bookingSchema.virtual('totalAmountFormatted').get(function () {
  return `₹${(this.totalAmount / 100).toFixed(2)}`;
});

// Make virtuals show up in JSON responses
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Booking', bookingSchema);