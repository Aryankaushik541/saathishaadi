# 🕉️ SaathiShaadi Backend v2.0

**Production-grade Matrimonial Backend** with full security hardening.

## 🔐 Security Features

| Feature | Status |
|---|---|
| Email OTP (Mobile OTP removed) | ✅ |
| OTP bcrypt hashing | ✅ |
| AES-256-GCM Encryption | ✅ |
| JWT token blacklist (logout) | ✅ |
| Account lockout (brute force) | ✅ |
| Rate Limiting (express-rate-limit) | ✅ |
| DDoS detection + IP auto-blacklist | ✅ |
| Helmet security headers | ✅ |
| MongoDB injection sanitization | ✅ |
| XSS protection | ✅ |
| HTTP Parameter Pollution prevention | ✅ |
| CORS whitelist | ✅ |
| Input validation (express-validator) | ✅ |
| Secure file upload (UUID names) | ✅ |
| Winston structured logging | ✅ |
| Graceful shutdown | ✅ |

## 📦 Setup

```bash
npm install
cp .env.example .env
# .env fill karein (SMTP, MongoDB etc.)
npm run dev
```

## 📧 Gmail Setup (Email OTP)

1. Gmail > Google Account > Security > 2-Step Verification ON karo
2. App Passwords > Generate karo (SaathiShaadi ke liye)
3. `.env` mein `SMTP_USER` aur `SMTP_PASS` set karo

## 🔑 Environment Variables

```
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=<64+ char random string>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong password>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=SaathiShaadi <noreply@saathishaadi.com>
ENCRYPTION_KEY=<64 hex chars = 32 bytes>
NODE_ENV=production
```

## 🛣️ API Routes

### Auth
```
POST /api/auth/send-otp      → Email par OTP bhejo
POST /api/auth/verify-otp    → Login (OTP verify)
POST /api/auth/register      → Naya account + OTP verify
POST /api/auth/logout        → Token invalidate
GET  /api/auth/me            → Apni profile
```

### Users
```
GET  /api/users              → Browse profiles (filters)
GET  /api/users/:id          → Single profile
PUT  /api/users/profile      → Profile update
```

### Proposals
```
POST /api/proposals          → Proposal bhejo
GET  /api/proposals/received → Received proposals
GET  /api/proposals/sent     → Sent proposals
PUT  /api/proposals/:id      → Accept/Reject
```

### Messages
```
GET  /api/messages/:userId   → Chat history
POST /api/messages           → Message bhejo
```

### Admin
```
POST /api/admin/login        → Admin login
GET  /api/admin/dashboard    → Stats
GET  /api/admin/users        → All users
PUT  /api/admin/users/:id/block
PUT  /api/admin/users/:id/unblock
DELETE /api/admin/users/:id
GET/POST/PUT/DELETE /api/admin/ads
```

## 🔒 Rate Limits

| Route | Limit |
|---|---|
| OTP send | 5 req / 10 min |
| Login/Verify | 10 req / 15 min |
| Global | 300 req / 15 min |
| API routes | 60 req / min |
| Admin | 50 req / 15 min |
| DDoS auto-block | >200 req/min |

## 🧪 Test OTP

Dev mode mein, console par OTP print hota hai.  
Production mein email aata hai (Gmail SMTP).
