const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit', 'refund'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be positive'],
      // always stored in paise (₹1 = 100 paise)
    },
    balanceAfter: {
      type: Number,
      required: true,
      // wallet balance snapshot after this transaction
    },
    description: {
      type: String,
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      // sparse = unique only when field is present
      // allows multiple docs without this field
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);