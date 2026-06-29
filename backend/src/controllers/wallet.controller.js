const { v4: uuidv4 } = require('uuid');
const walletService = require('../services/wallet.service');

// ─────────────────────────────────────────
// @route   GET /api/wallet/balance
// @access  Private
// ─────────────────────────────────────────
const getBalance = async (req, res) => {
  const balance = await walletService.getBalance(req.user._id);

  res.json({
    success: true,
    data: {
      balance,                              // raw paise
      balanceFormatted: `₹${(balance / 100).toFixed(2)}`,
    },
  });
};

// ─────────────────────────────────────────
// @route   POST /api/wallet/add
// @access  Private
// ─────────────────────────────────────────
const addMoney = async (req, res) => {
  const { amount, idempotencyKey } = req.body;

  // amount comes in as rupees from frontend, convert to paise
  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid amount',
    });
  }

  if (amount > 100000) {
    return res.status(400).json({
      success: false,
      message: 'Cannot add more than ₹1,00,000 at once',
    });
  }

  // Convert rupees → paise and ensure integer
  const amountInPaise = Math.round(amount * 100);

  // Use provided idempotency key or generate one
  const key = idempotencyKey || uuidv4();

  const result = await walletService.creditWallet(
    req.user._id,
    amountInPaise,
    `Wallet top-up of ₹${amount}`,
    key
  );

  if (result.alreadyProcessed) {
    return res.status(200).json({
      success: true,
      message: 'Transaction already processed (idempotent)',
      data: { transaction: result.transaction },
    });
  }

  res.status(201).json({
    success: true,
    message: `₹${amount} added to wallet successfully`,
    data: {
      transaction: result.transaction,
      newBalance: result.balance,
      newBalanceFormatted: `₹${(result.balance / 100).toFixed(2)}`,
    },
  });
};

// ─────────────────────────────────────────
// @route   GET /api/wallet/transactions
// @access  Private
// ─────────────────────────────────────────
const getTransactions = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await walletService.getTransactionHistory(
    req.user._id,
    page,
    limit
  );

  res.json({
    success: true,
    data: result,
  });
};

module.exports = { getBalance, addMoney, getTransactions };