// ──────────────────────────────────────────────
//  utils/claudeAI.js — Anthropic AI Integration
// ──────────────────────────────────────────────
const fetch = require('node-fetch');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

async function callClaude(prompt, maxTokens = 700) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    console.warn('[Claude] No API key set — returning simulated result.');
    return simulateResult(prompt);
  }

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  return data.content?.map(c => c.text || '').join('') || '';
}

// Generic verify — used when caller passes a full prompt
async function verify(prompt) {
  return callClaude(prompt);
}

// ── PAN Verification ────────────────────────────
async function verifyPAN({ pan, name, appName, holderType }) {
  const prompt = `You are a KYC verification AI for SwiftLoan, a licensed personal loan NBFC in India.

Verify this PAN card information:
- PAN Number: ${pan}
- Holder Type: ${holderType}
- Name on PAN: ${name || 'Not provided'}
- Applicant Name: ${appName || 'Not provided'}

Perform:
1. PAN format validation (AAAAA0000A)
2. Holder type identification (4th character)
3. Name consistency check
4. Red flag assessment

Output format:
✅/❌ PAN Format: [result]
✅/❌ Holder Type: ${holderType}
✅/⚠️ Name Match: [assessment]
Risk Level: LOW / MEDIUM / HIGH
Status: APPROVED / NEEDS REVIEW / REJECTED
Reason: [1-2 lines]
Note: Production verification uses NSDL/UTI PAN Inquiry API.`;
  return callClaude(prompt);
}

// ── Aadhaar Verification ───────────────────────
async function verifyAadhaar({ aadhaar, name, appName, addr, appAddr, checksumOk }) {
  const prompt = `You are a KYC verification AI for SwiftLoan.

Verify Aadhaar data (UIDAI compliant — only last 4 digits):
- Last 4 Digits: ${aadhaar.slice(-4)}
- Verhoeff Checksum: ${checksumOk ? 'PASS' : 'FAIL'}
- Name on Aadhaar: ${name || 'Not provided'}
- Applicant Name: ${appName || 'Not provided'}
- Address on Aadhaar: ${addr || 'Not provided'}
- Applicant Address: ${appAddr || 'Not provided'}

Output:
✅/❌ Format Check: [12-digit numeric]
✅/❌ Checksum (Verhoeff): ${checksumOk ? 'PASS' : 'FAIL'}
✅/⚠️ Name Match: [assessment]
✅/⚠️ Address Match: [assessment]
OTP Verification: Pending — would trigger UIDAI API in production
Risk Level: LOW / MEDIUM / HIGH
Status: APPROVED / NEEDS REVIEW / REJECTED
Reason: [1-2 lines]`;
  return callClaude(prompt);
}

// ── Selfie / Face Match ─────────────────────────
async function verifySelfie({ appName }) {
  const prompt = `You are a biometric liveness and face-match AI for SwiftLoan.
Applicant: ${appName || 'Unknown'}

Simulate results of:
1. Liveness Detection (blink/depth/3D check)
2. Face Match vs PAN/Aadhaar reference photo
3. Anti-spoofing check
4. Image quality assessment

Output:
✅/❌ Liveness Detection: PASS/FAIL
✅/❌ Face Match Score: [85-99]%
✅/❌ Spoofing Detection: No spoofing / Suspicious
✅/❌ Image Quality: Good/Poor
Status: VERIFIED / NEEDS MANUAL REVIEW / REJECTED
Reason: [1-2 lines]
Note: Production uses AWS Rekognition / Azure Face API.`;
  return callClaude(prompt);
}

// ── Bank Statement Analysis ─────────────────────
async function analyseStatement({ bank, income, emi, foir }) {
  const prompt = `You are a bank statement analysis AI for SwiftLoan personal loans.
- Bank: ${bank || 'Not provided'}
- Declared Income: ₹${income || 'Unknown'}/month
- Requested EMI: ₹${emi || 'Unknown'}/month
- FOIR: ${foir || 'N/A'}%

Simulate analysis of 6-month bank statement:
1. Average Monthly Credits: ₹[amount] — [stable/irregular]
2. Average Monthly Debits: ₹[amount]
3. Month-end Balance Trend: [growing/stable/declining]
4. Income Consistency: Regular/Irregular
5. Existing EMIs detected: ₹[amount]
6. FOIR Assessment: [Healthy <40% / Acceptable / High >55%]
7. Cheque Bounces (6 months): [count]
8. Fraud Indicators: None / [specify]
9. Statement Authenticity: Genuine / Suspicious
10. Overall Assessment: APPROVED / NEEDS REVIEW / REJECTED
Recommendation: [2 lines]
Note: Production uses NBFC Account Aggregator (AA) framework or Perfios/Karza APIs.`;
  return callClaude(prompt);
}

// ── Loan Eligibility Assessment ─────────────────
async function assessEligibility({ loanAmount, tenure, emi, income, foir, employment, city, stateVal, kycStatus, purpose }) {
  const allKyc = kycStatus ? Object.values(kycStatus).every(Boolean) : false;
  const prompt = `You are a loan eligibility AI for SwiftLoan Personal Loans.

Application:
- Loan: ₹${loanAmount} for ${tenure} months | EMI: ₹${emi}/month
- Income: ₹${income}/month | FOIR: ${foir}%
- Employment: ${employment}
- Location: ${city}, ${stateVal}
- Purpose: ${purpose}
- KYC Complete: ${allKyc ? 'Yes — all 4 checks passed' : 'Partial'}

Generate:
ELIGIBILITY: [APPROVED / CONDITIONALLY APPROVED / UNDER REVIEW]
SCORE: [XX]/100
STRENGTHS:
• [strength 1]
• [strength 2]
CONSIDERATIONS:
• [consideration or "None"]
RECOMMENDED AMOUNT: ₹[amount]
PROCESSING TIME: [X business days]
NEXT STEPS:
• [step 1]
• [step 2]
• [step 3]`;
  return callClaude(prompt, 600);
}

// ── Fallback Simulator ──────────────────────────
function simulateResult(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('pan')) {
    return '✅ PAN Format: Valid\n✅ Holder Type: Individual\n✅ Name Match: Consistent\nRisk Level: LOW\nStatus: APPROVED\nReason: PAN details validated successfully. (Simulated — set ANTHROPIC_API_KEY in .env)';
  }
  if (lower.includes('aadhaar')) {
    return '✅ Format Check: Valid (12-digit)\n✅ Checksum (Verhoeff): PASS\n✅ Name Match: Consistent\n✅ Address Match: Verified\nOTP Verification: Pending\nRisk Level: LOW\nStatus: APPROVED\nReason: Aadhaar details are valid. (Simulated)';
  }
  if (lower.includes('selfie') || lower.includes('face') || lower.includes('liveness')) {
    return '✅ Liveness Detection: PASS\n✅ Face Match Score: 93%\n✅ Spoofing Detection: No spoofing\n✅ Image Quality: Good\nStatus: VERIFIED\nReason: High-confidence identity match. (Simulated)';
  }
  if (lower.includes('statement') || lower.includes('bank')) {
    return '✅ Average Monthly Credits: ₹52,000 — Stable\n✅ Income Consistency: Regular\n✅ FOIR: Healthy\n✅ Cheque Bounces: 0\n✅ Statement Authenticity: Genuine\nOverall Assessment: APPROVED\nRecommendation: Income strongly supports requested EMI. (Simulated)';
  }
  if (lower.includes('eligibility')) {
    return 'ELIGIBILITY: APPROVED\nSCORE: 79/100\nSTRENGTHS:\n• Stable income supports EMI\n• KYC documents complete\nCONSIDERATIONS:\n• None\nRECOMMENDED AMOUNT: As requested\nPROCESSING TIME: 2-3 business days\nNEXT STEPS:\n• Check email for sanction letter\n• E-sign digitally\n• Disbursal within 3-5 days (Simulated)';
  }
  return 'Verification complete. (Simulated — set ANTHROPIC_API_KEY in .env to enable real AI)';
}

module.exports = { verify, verifyPAN, verifyAadhaar, verifySelfie, analyseStatement, assessEligibility };
