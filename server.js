// ──────────────────────────────────────────────
//  SwiftLoan — Backend API Server
//  Node.js + Express
// ──────────────────────────────────────────────
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const fs         = require('fs');

const kycRoutes  = require('./kyc');
const loanRoutes = require('./loan');
const authRoutes = require('./auth');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Ensure upload directories exist ────────────
['uploads/pan', 'uploads/aadhaar', 'uploads/selfie', 'uploads/statement'].forEach(dir => {
  fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
});

// ── Security Middleware ─────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // relax for dev; tighten in production
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate Limiting ───────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const kycLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message: { error: 'Too many KYC attempts. Please wait 10 minutes.' },
});

app.use(globalLimiter);

// ── Body Parsers ────────────────────────────────
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ── Logging ─────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Health Check ────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SwiftLoan API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ── API Routes ───────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/kyc',     kycLimiter, kycRoutes);
app.use('/api/loan',    loanRoutes);

// ── Serve Frontend (optional static serve) ──────
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
// ── Global Error Handler ────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  if (process.env.NODE_ENV === 'development') console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Start ────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║     SwiftLoan Backend API v1.0       ║');
  console.log(`║     Running on port ${PORT}              ║`);
  console.log(`║     Env: ${(process.env.NODE_ENV || 'development').padEnd(26)}║`);
  console.log('╚══════════════════════════════════════╝\n');
  console.log('  API Routes:');
  console.log('  → GET  /health');
  console.log('  → POST /api/auth/register');
  console.log('  → POST /api/kyc/pan');
  console.log('  → POST /api/kyc/aadhaar');
  console.log('  → POST /api/kyc/selfie');
  console.log('  → POST /api/kyc/statement');
  console.log('  → POST /api/loan/eligibility');
  console.log('  → POST /api/loan/submit');
  console.log('  → GET  /api/loan/status/:ref\n');
});

module.exports = app;
