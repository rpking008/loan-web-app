# SwiftLoan — Personal Loan Application Platform

A full-stack personal loan application with AI-powered KYC verification.

---

## Project Structure

```
swiftloan/
├── frontend/
│   ├── index.html          # Main application (7-step flow)
│   ├── css/
│   │   └── style.css       # Full styles — luxury dark sidebar aesthetic
│   └── js/
│       └── app.js          # EMI calculator, KYC logic, camera, API calls
│
└── backend/
    ├── server.js           # Express server entry point
    ├── .env.example        # Environment variables template
    ├── package.json
    ├── routes/
    │   ├── kyc.js          # PAN, Aadhaar, Selfie, Bank Statement endpoints
    │   ├── loan.js         # Eligibility, Submit, Status endpoints
    │   └── auth.js         # Register, Login, OTP endpoints
    └── utils/
        ├── claudeAI.js     # Anthropic Claude integration
        └── validators.js   # PAN/Aadhaar/IFSC/FOIR validators
```

---

## Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
node server.js
```

Backend runs at: `http://localhost:4000`

### 2. Frontend
```bash
# Option A: Use backend as static server (already configured)
# Just visit http://localhost:4000

# Option B: Any static server
cd frontend
npx serve .
# Visit http://localhost:3000
```

---

## Application Flow (7 Steps)

| Step | Screen              | Key Features |
|------|---------------------|--------------|
| 1    | Loan Setup          | EMI calculator, amount/tenure/rate sliders, purpose selection |
| 2    | Personal Details    | Name, DOB, mobile, email, employment, income, address |
| 3    | PAN Verification    | PAN number entry, document upload, AI format + name check |
| 4    | Aadhaar KYC         | Aadhaar entry (Verhoeff checksum), front/back upload, AI verify |
| 5    | Selfie & Face Match | Live camera capture or photo upload, AI liveness simulation |
| 6    | Bank Statement      | Bank details, multi-file statement upload, AI income analysis |
| 7    | Review & Submit     | Full summary, AI eligibility score, consent, submission |

---

## API Endpoints

### KYC
| Method | Endpoint              | Description |
|--------|-----------------------|-------------|
| POST   | `/api/kyc/pan`        | Verify PAN (multipart: panFront, panBack) |
| POST   | `/api/kyc/aadhaar`    | Verify Aadhaar (multipart: aadhaarFront, aadhaarBack) |
| POST   | `/api/kyc/selfie`     | Face match + liveness (multipart: selfie) |
| POST   | `/api/kyc/statement`  | Analyse bank statements (multipart: statement[]) |
| GET    | `/api/kyc/status/:id` | Get KYC status for an application |

### Loan
| Method | Endpoint                       | Description |
|--------|--------------------------------|-------------|
| POST   | `/api/loan/eligibility`        | Run AI eligibility assessment |
| POST   | `/api/loan/submit`             | Submit full application |
| GET    | `/api/loan/status/:refNo`      | Track application status |
| GET    | `/api/loan/applications`       | List all applications (admin) |
| PATCH  | `/api/loan/status/:refNo`      | Update status (admin) |
| POST   | `/api/loan/nextsteps`          | Generate personalised next steps |

### Auth
| Method | Endpoint                  | Description |
|--------|---------------------------|-------------|
| POST   | `/api/auth/register`      | Register new user |
| POST   | `/api/auth/login`         | Login |
| POST   | `/api/auth/send-otp`      | Send OTP to mobile |
| POST   | `/api/auth/verify-otp`    | Verify OTP |

---

## KYC Validation Details

### PAN Card
- Format: `AAAAA0000A` (5 letters + 4 digits + 1 letter)
- 4th character identifies holder type:
  - `P` = Individual, `H` = HUF, `C` = Company, `F` = Firm
- **Production**: Integrate with NSDL Inquiry API or UTI PAN verification

### Aadhaar
- 12-digit numeric
- First digit cannot be 0 or 1
- Verhoeff checksum validation (built-in)
- **Per UIDAI**: Only last 4 digits stored — full number never saved
- **Production**: UIDAI Authentication API via licensed AUA/KUA partner only

### Face Match
- Live camera capture using `getUserMedia()`
- Face oval guide overlay
- **Production**: AWS Rekognition `CompareFaces` + `DetectFaces` for liveness

### Bank Statement
- Accepts PDF, Excel, CSV
- Multiple files (up to 6)
- FOIR calculation: EMI ÷ Monthly Income × 100
- **Production**: NBFC Account Aggregator (AA) framework or Perfios / Karza API

---

## Production Integrations to Add

| Feature | Service |
|---------|---------|
| PAN verification | NSDL / UTI Verification API |
| Aadhaar OTP auth | UIDAI via licensed AUA partner |
| Face matching | AWS Rekognition / Azure Face API |
| Bank statements | Perfios / Karza / AA Framework |
| Credit bureau | CIBIL / Experian / CRIF |
| SMS OTP | Twilio / MSG91 / Kaleyra |
| Email | SendGrid / AWS SES |
| Database | PostgreSQL with Prisma ORM |
| File storage | AWS S3 (encrypted, private) |
| Auth | JWT + refresh tokens + bcrypt |

---

## RBI / Regulatory Compliance Notes

- Aadhaar: Use UIDAI-licensed KYC User Agency (KUA) only — direct Aadhaar API requires licence
- PAN: NSDL and UTI provide authorised PAN verification APIs
- Data retention: KYC documents must be retained for 5 years per PMLA guidelines
- Privacy: Aadhaar data handling governed by Aadhaar Act 2016
- Account Aggregator: Use RBI-licensed AA entities for bank statement access

---

## Environment Variables

See `.env.example` for all required variables. Key ones:
- `ANTHROPIC_API_KEY` — for AI KYC verification (required for AI features)
- `DATABASE_URL` — PostgreSQL connection (replace in-memory store)
- `JWT_SECRET` — for production auth tokens
- `AWS_*` — for S3 document storage and Rekognition face match
