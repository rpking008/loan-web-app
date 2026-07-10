// ──────────────────────────────────────────────
//  utils/validators.js — Indian KYC Validators
// ──────────────────────────────────────────────

// ── PAN Validation ──────────────────────────────
function validatePAN(pan) {
  if (!pan) return { valid: false, message: 'PAN number is required.' };
  const cleaned = pan.toString().trim().toUpperCase();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cleaned)) {
    return { valid: false, message: 'Invalid PAN format. Expected: AAAAA0000A' };
  }
  return { valid: true, pan: cleaned };
}

// PAN 4th character → holder type mapping
const PAN_HOLDER_TYPES = {
  P: 'Individual (Person)',
  H: 'Hindu Undivided Family (HUF)',
  C: 'Company',
  F: 'Firm / Partnership',
  A: 'Association of Persons (AOP)',
  T: 'Trust',
  B: 'Body of Individuals (BOI)',
  L: 'Local Authority',
  J: 'Artificial Juridical Person',
  G: 'Government',
};

function getPANHolderType(pan) {
  const ch = pan?.toString().toUpperCase()[3] || '';
  return PAN_HOLDER_TYPES[ch] || 'Unknown';
}

// ── Aadhaar Validation ──────────────────────────
function validateAadhaar(aadhaar) {
  if (!aadhaar) return { valid: false, message: 'Aadhaar number is required.' };
  const raw = aadhaar.toString().replace(/\s/g, '');
  if (!/^\d{12}$/.test(raw)) {
    return { valid: false, message: 'Aadhaar must be exactly 12 digits.' };
  }
  // First digit cannot be 0 or 1
  if (['0', '1'].includes(raw[0])) {
    return { valid: false, message: 'Invalid Aadhaar number. First digit cannot be 0 or 1.' };
  }
  return { valid: true, aadhaar: raw };
}

// ── Verhoeff Checksum (UIDAI Standard) ──────────
const verhoeffD = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,2,3,4,0,6,7,8,9,5],
  [2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],
  [4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],
  [7,6,5,9,8,2,1,0,4,3],
  [8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];
const verhoeffP = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,5,7,6,2,8,3,0,9,4],
  [5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],
  [4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],
  [7,0,4,6,9,1,3,2,5,8],
];
const verhoeffInv = [0,4,3,2,1,9,8,7,6,5];

function verhoeffCheck(num) {
  try {
    const digits = num.toString().split('').map(Number);
    let c = 0;
    for (let i = 0; i < digits.length; i++) {
      const ri = (digits.length - i - 1) % 8;
      c = verhoeffD[c][verhoeffP[ri][digits[i]]];
    }
    return c === 0;
  } catch {
    return false;
  }
}

// ── IFSC Validation ─────────────────────────────
function validateIFSC(ifsc) {
  if (!ifsc) return { valid: false, message: 'IFSC code is required.' };
  const cleaned = ifsc.toString().toUpperCase().trim();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleaned)) {
    return { valid: false, message: 'Invalid IFSC format. Expected: AAAA0XXXXXX' };
  }
  return { valid: true, ifsc: cleaned };
}

// ── Mobile Validation ───────────────────────────
function validateMobile(mobile) {
  const raw = mobile?.toString().replace(/\D/g, '') || '';
  if (!/^[6-9]\d{9}$/.test(raw)) {
    return { valid: false, message: 'Mobile must be 10 digits starting with 6-9.' };
  }
  return { valid: true, mobile: raw };
}

// ── Email Validation ────────────────────────────
function validateEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, message: 'Invalid email address.' };
  }
  return { valid: true, email };
}

// ── PIN Code Validation ─────────────────────────
function validatePincode(pin) {
  if (!pin || !/^\d{6}$/.test(pin.toString())) {
    return { valid: false, message: 'PIN code must be 6 digits.' };
  }
  return { valid: true, pin };
}

// ── FOIR Calculator ─────────────────────────────
function calculateFOIR(emi, income) {
  if (!income || income <= 0) return null;
  return ((emi / income) * 100).toFixed(1);
}

function foirRating(foir) {
  const f = parseFloat(foir);
  if (f <= 40) return { rating: 'Healthy', risk: 'LOW', recommended: true };
  if (f <= 55) return { rating: 'Acceptable', risk: 'MEDIUM', recommended: true };
  return { rating: 'High', risk: 'HIGH', recommended: false };
}

// ── Loan EMI Calculator ─────────────────────────
function calculateEMI(principal, annualRate, tenureMonths) {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / tenureMonths;
  return (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
}

module.exports = {
  validatePAN,
  getPANHolderType,
  validateAadhaar,
  verhoeffCheck,
  validateIFSC,
  validateMobile,
  validateEmail,
  validatePincode,
  calculateFOIR,
  foirRating,
  calculateEMI,
};
