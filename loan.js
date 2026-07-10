// ──────────────────────────────────────────────
//  routes/loan.js — Loan Application Endpoints
// ──────────────────────────────────────────────
const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const claudeAI = require('../utils/claudeAI');

const router = express.Router();
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// In-memory store (replace with DB in production)
const applications = new Map();

// ════════════════════════════════════════════════
//  POST /api/loan/eligibility
//  Runs AI eligibility assessment
// ════════════════════════════════════════════════
router.post('/eligibility', asyncHandler(async (req, res) => {
  const { prompt, loanAmount, tenure, emi, income, foir, employment, city, state: stateVal, kycStatus, purpose } = req.body;

  let result;
  if (prompt) {
    result = await claudeAI.verify(prompt);
  } else {
    result = await claudeAI.assessEligibility({
      loanAmount, tenure, emi, income, foir, employment, city, state: stateVal, kycStatus, purpose,
    });
  }

  // Parse score from result text
  const scoreMatch = result.match(/SCORE[:\s]+(\d+)/i);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;
  const approved = result.includes('APPROVED') && !result.includes('REJECTED');

  res.json({
    success: true,
    eligibility: {
      status: approved ? 'APPROVED' : 'NEEDS_REVIEW',
      score,
      result,
    },
    timestamp: new Date().toISOString(),
  });
}));

// ════════════════════════════════════════════════
//  POST /api/loan/nextsteps
//  Generates personalised next steps
// ════════════════════════════════════════════════
router.post('/nextsteps', asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  const result = await claudeAI.verify(prompt || 'List 5 next steps for a personal loan applicant in India.');
  res.json({ success: true, result });
}));

// ════════════════════════════════════════════════
//  POST /api/loan/submit
//  Saves the full application
// ════════════════════════════════════════════════
router.post('/submit', asyncHandler(async (req, res) => {
  const {
    referenceNo, loanAmount, tenure, emi,
    applicant, mobile, email,
    pan, aadhaarLast4,
    bankName, accountNo, ifsc,
    kycStatus, eligibility,
    purpose, income, employment,
    city, state: stateVal,
  } = req.body;

  const ref = referenceNo || ('SL-' + uuidv4().substring(0, 8).toUpperCase());
  const timestamp = new Date().toISOString();

  const application = {
    referenceNo: ref,
    status: 'SUBMITTED',
    submittedAt: timestamp,
    loan: { loanAmount, tenure, emi, purpose },
    applicant: { name: applicant, mobile, email, pan, aadhaarLast4, income, employment, city, state: stateVal },
    bank: { bankName, accountNo: accountNo ? '****' + accountNo.slice(-4) : null, ifsc },
    kyc: kycStatus || {},
    eligibility,
    timeline: [
      { event: 'Application Submitted', timestamp, status: 'DONE' },
      { event: 'KYC Verification', timestamp: null, status: 'PENDING' },
      { event: 'Credit Bureau Check', timestamp: null, status: 'PENDING' },
      { event: 'Loan Sanction', timestamp: null, status: 'PENDING' },
      { event: 'Agreement Signing', timestamp: null, status: 'PENDING' },
      { event: 'Disbursement', timestamp: null, status: 'PENDING' },
    ],
  };

  applications.set(ref, application);

  console.log(`[LOAN SUBMITTED] Ref: ${ref} | Applicant: ${applicant} | Amount: ₹${loanAmount}`);

  // In production: save to PostgreSQL, trigger email/SMS via SendGrid/Twilio, notify team

  res.status(201).json({
    success: true,
    referenceNo: ref,
    message: 'Application submitted successfully. You will receive confirmation via SMS and email.',
    submittedAt: timestamp,
    estimatedDecision: '2–3 business days',
  });
}));

// ════════════════════════════════════════════════
//  GET /api/loan/status/:referenceNo
//  Track application status
// ════════════════════════════════════════════════
router.get('/status/:referenceNo', asyncHandler(async (req, res) => {
  const { referenceNo } = req.params;
  const app = applications.get(referenceNo);

  if (!app) {
    return res.status(404).json({
      error: 'Application not found',
      referenceNo,
      note: 'Application data resets on server restart in development mode.',
    });
  }

  res.json({
    success: true,
    referenceNo,
    status: app.status,
    submittedAt: app.submittedAt,
    applicant: { name: app.applicant.name, mobile: app.applicant.mobile },
    loan: app.loan,
    kyc: app.kyc,
    timeline: app.timeline,
  });
}));

// ════════════════════════════════════════════════
//  GET /api/loan/applications  (admin)
// ════════════════════════════════════════════════
router.get('/applications', asyncHandler(async (req, res) => {
  const list = Array.from(applications.values()).map(a => ({
    referenceNo: a.referenceNo,
    status: a.status,
    submittedAt: a.submittedAt,
    applicant: a.applicant.name,
    loanAmount: a.loan.loanAmount,
    kyc: a.kyc,
  }));
  res.json({ success: true, count: list.length, applications: list });
}));

// ════════════════════════════════════════════════
//  PATCH /api/loan/status/:referenceNo  (admin)
// ════════════════════════════════════════════════
router.patch('/status/:referenceNo', asyncHandler(async (req, res) => {
  const { referenceNo } = req.params;
  const { status, remarks } = req.body;
  const app = applications.get(referenceNo);
  if (!app) return res.status(404).json({ error: 'Not found' });
  app.status = status;
  app.updatedAt = new Date().toISOString();
  if (remarks) app.remarks = remarks;
  applications.set(referenceNo, app);
  res.json({ success: true, referenceNo, status, updatedAt: app.updatedAt });
}));

module.exports = router;
