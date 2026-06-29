const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '../../.env'),
});

console.log(process.env.MONGO_URI);
console.log("MONGO_URI =", process.env.MONGO_URI);
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('./db');

const seedAdmin = async () => {
  await connectDB();

  const existing = await User.findOne({ email: 'admin@tickets.com' });
  if (existing) {
    console.log('Admin already exists');
    process.exit(0);
  }

  await User.create({
    name: 'Super Admin',
    email: 'admin@tickets.com',
    passwordHash: 'admin123456',   // bcrypt runs via pre-save hook
    role: 'admin',
  });

  console.log('Admin created: admin@tickets.com / admin123456');
  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});