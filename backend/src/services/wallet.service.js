const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ─────────────────────────────────────────
// Credit wallet (add money)
// ─────────────────────────────────────────
const creditWallet = async (userId, amount, description, idempotencyKey, session = null) => {

  // If idempotencyKey provided, check if already processed
  if (idempotencyKey) {
    const existing = await Transaction.findOne({ idempotencyKey });
    if (existing) {
      return { alreadyProcessed: true, transaction: existing };
    }
  }

  // Atomically increment balance and get new balance
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { 'wallet.balance': amount } },
    { new: true, session }
  );

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Record transaction in ledger
  const [transaction] = await Transaction.create(
    [
      {
        userId,
        type: 'credit',
        amount,
        balanceAfter: user.wallet.balance,
        description,
        idempotencyKey: idempotencyKey || undefined,
      },
    ],
    { session }
  );

  return { alreadyProcessed: false, transaction, balance: user.wallet.balance };
};

// ─────────────────────────────────────────
// Debit wallet (pay for booking)
// ─────────────────────────────────────────
const debitWallet = async (userId, amount, description, bookingId, session = null) => {

  // Atomically deduct ONLY if balance is sufficient
  // $inc with negative + condition prevents negative balance
  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      'wallet.balance': { $gte: amount }, // key condition
    },
    { $inc: { 'wallet.balance': -amount } },
    { new: true, session }
  );

  // If no user returned — either not found OR insufficient balance
  if (!user) {
    const existingUser = await User.findById(userId).session(session);
    if (!existingUser) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }
    throw Object.assign(
      new Error(`Insufficient balance. Required: ₹${(amount / 100).toFixed(2)}, Available: ₹${(existingUser.wallet.balance / 100).toFixed(2)}`),
      { statusCode: 400 }
    );
  }

  // Record transaction in ledger
  const [transaction] = await Transaction.create(
    [
      {
        userId,
        type: 'debit',
        amount,
        balanceAfter: user.wallet.balance,
        description,
        bookingId: bookingId || undefined,
      },
    ],
    { session }
  );

  return { transaction, balance: user.wallet.balance };
};

// ─────────────────────────────────────────
// Refund wallet (admin cancels booking)
// ─────────────────────────────────────────
const refundWallet = async (userId, amount, description, bookingId, session = null) => {

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { 'wallet.balance': amount } },
    { new: true, session }
  );

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const [transaction] = await Transaction.create(
    [
      {
        userId,
        type: 'refund',
        amount,
        balanceAfter: user.wallet.balance,
        description,
        bookingId: bookingId || undefined,
      },
    ],
    { session }
  );

  return { transaction, balance: user.wallet.balance };
};

// ─────────────────────────────────────────
// Get wallet balance
// ─────────────────────────────────────────
const getBalance = async (userId) => {
  const user = await User.findById(userId).select('wallet');
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  return user.wallet.balance;
};

// ─────────────────────────────────────────
// Get transaction history for a user
// ─────────────────────────────────────────
const getTransactionHistory = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('bookingId', 'status eventId'),
    Transaction.countDocuments({ userId }),
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

module.exports = {
  creditWallet,
  debitWallet,
  refundWallet,
  getBalance,
  getTransactionHistory,
};