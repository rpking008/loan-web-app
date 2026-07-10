// ──────────────────────────────────────────────
//  routes/auth.js — Authentication Endpoints
// ──────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// In-memory user store (use PostgreSQL + bcrypt in production)
const users = new Map();

// ── POST /api/auth/register ──────────────────────
router.post('/register', asyncHandler(async (req, res) => {
  const { name, mobile, email, password } = req.body;

  if (!name || !mobile || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return res.status(400).json({ error: 'Invalid mobile number.' });
  }
  if (users.has(mobile)) {
    return res.status(409).json({ error: 'Mobile number already registered.' });
  }

  const userId = uuidv4();
  // In production: hash password with bcrypt, save to DB
  users.set(mobile, { userId, name, mobile, email, createdAt: new Date().toISOString() });

  res.status(201).json({
    success: true,
    userId,
    message: 'Registration successful. Please verify your mobile via OTP.',
    // In production: trigger OTP via Twilio
  });
}));

// ── POST /api/auth/login ─────────────────────────
router.post('/login', asyncHandler(async (req, res) => {
  const { mobile, password } = req.body;
  const user = users.get(mobile);
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

  // In production: compare bcrypt hash, return JWT
  res.json({
    success: true,
    userId: user.userId,
    name: user.name,
    token: 'jwt-token-' + uuidv4(), // Replace with real JWT
    message: 'Login successful.',
  });
}));

// ── POST /api/auth/send-otp ──────────────────────
router.post('/send-otp', asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return res.status(400).json({ error: 'Invalid mobile number.' });
  }
  // In production: generate 6-digit OTP, store with expiry, send via Twilio
  const otp = Math.floor(100000 + Math.random() * 900000);
  console.log(`[OTP] Mobile: +91${mobile} | OTP: ${otp}`); // Log in dev only
  res.json({ success: true, message: `OTP sent to +91${mobile}. (Dev: ${otp})` });
}));

// ── POST /api/auth/verify-otp ────────────────────
router.post('/verify-otp', asyncHandler(async (req, res) => {
  const { mobile, otp } = req.body;
  // In production: verify OTP against stored value with expiry check
  if (!otp || otp.length !== 6) return res.status(400).json({ error: 'Invalid OTP.' });
  res.json({ success: true, message: 'Mobile verified successfully.' });
}));

module.exports = router;
