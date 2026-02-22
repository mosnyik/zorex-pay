# Zorex Pay - Security Model

## Overview

This document outlines the security architecture, threat model, and protective measures implemented in Zorex Pay.

---

## Authentication & Authorization

### JWT Token Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    TOKEN ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ACCESS TOKEN                    REFRESH TOKEN               │
│  ┌────────────────────┐         ┌────────────────────┐      │
│  │ Expiry: 5 minutes  │         │ Expiry: 24 hours   │      │
│  │ Storage: Cookie    │         │ Storage: Cookie+DB │      │
│  │ Purpose: API auth  │         │ Purpose: Renew AT  │      │
│  │ Stateless: Yes     │         │ Stateless: No      │      │
│  └────────────────────┘         └────────────────────┘      │
│                                                              │
│  Cookie Flags:                                               │
│  • httpOnly: true  (No JS access - XSS protection)          │
│  • secure: true    (HTTPS only in production)               │
│  • sameSite: strict (CSRF protection)                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Token Rotation

Every refresh operation:
1. Validates current refresh token
2. Checks against database (not revoked, not expired)
3. Issues new access + refresh tokens
4. Marks old refresh token as revoked
5. Records replacement token for audit trail

```typescript
// Token rotation prevents token reuse attacks
await tx.refresh_tokens.update({
  where: { id: oldToken.id },
  data: {
    is_revoked: true,
    replaced_by_token: newRefreshToken
  }
});
```

### Password Security

- **Hashing Algorithm:** bcrypt
- **Cost Factor:** 12 (100-400ms hash time)
- **Salt:** Auto-generated per password

```typescript
const hash = await bcrypt.hash(password, 12);
const valid = await bcrypt.compare(input, hash);
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- Special characters recommended

---

## API Security

### Input Validation

All inputs validated with Zod schemas before processing:

```typescript
const registerSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  userName: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  password: z.string().min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
});
```

### SQL Injection Prevention

Prisma ORM provides parameterized queries:

```typescript
// Safe - parameterized
const user = await prisma.users.findUnique({
  where: { email: userInput }
});

// Never do this
// const user = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${userInput}`;
```

### Rate Limiting (To Implement)

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { error: 'Too many attempts, try again later' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);
```

### CORS Configuration

```typescript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

---

## Webhook Security

### Signature Verification

All webhooks must be verified before processing:

#### Paystack Webhooks

```typescript
import crypto from 'crypto';

function verifyPaystackSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');

  // Timing-safe comparison prevents timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(hash)
  );
}
```

#### NOWPayments Webhooks

```typescript
function verifyNowPaymentsSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const sorted = JSON.stringify(sortKeys(JSON.parse(payload)));
  const hash = crypto
    .createHmac('sha512', secret)
    .update(sorted)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(hash)
  );
}
```

### Webhook Processing Pattern

```typescript
export async function webhookHandler(req: Request, res: Response) {
  // 1. Verify signature FIRST
  const signature = req.headers['x-signature'];
  const rawBody = req.body.toString();

  if (!verifySignature(rawBody, signature)) {
    logger.warn('Invalid webhook signature', { ip: req.ip });
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. Acknowledge receipt immediately (prevent timeouts)
  res.status(200).json({ received: true });

  // 3. Process asynchronously
  processWebhookAsync(JSON.parse(rawBody)).catch(err => {
    logger.error('Webhook processing failed', err);
  });
}
```

---

## Financial Security

### Idempotency

All financial operations use unique references:

```typescript
// Generate unique reference
const reference = `zorex_${uuidv4()}`;

// Upsert pattern - safe to retry
const transaction = await prisma.transactions.upsert({
  where: { reference },
  create: { /* ... */ },
  update: {} // No update - idempotent
});

// Check existing entries
const existing = await prisma.ledger_entries.count({
  where: { transaction_id: transaction.id }
});

if (existing > 0) {
  return transaction; // Already processed
}
```

### Atomic Transactions

All financial operations are atomic:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Verify balance
  const balance = await calculateBalance(tx, walletId);
  if (balance < amount) throw new InsufficientBalanceError();

  // 2. Create transaction record
  const txn = await tx.transactions.create({ /* ... */ });

  // 3. Create debit entry
  await tx.ledger_entries.create({
    data: { direction: 'DEBIT', amount, /* ... */ }
  });

  // 4. Create credit entry
  await tx.ledger_entries.create({
    data: { direction: 'CREDIT', amount, /* ... */ }
  });

  // ALL succeed or ALL fail
});
```

### Balance Calculation

Balances are NEVER stored - always calculated:

```typescript
function calculateBalance(entries: LedgerEntry[]): Decimal {
  let balance = new Decimal(0);

  for (const entry of entries) {
    if (entry.direction === 'CREDIT') {
      balance = balance.plus(entry.amount);
    } else {
      balance = balance.minus(entry.amount);
    }
  }

  return balance;
}
```

### Immutable Ledger

Ledger entries are NEVER modified or deleted:

```sql
-- No UPDATE on ledger_entries
-- No DELETE on ledger_entries
-- Only INSERT allowed

-- Corrections are made via reversal transactions
```

---

## Data Protection

### Sensitive Data Handling

| Data Type | Storage | Transmission |
|-----------|---------|--------------|
| Passwords | bcrypt hash | Never transmitted |
| Tokens | DB (refresh only) | httpOnly cookies |
| API Keys | Environment vars | Never logged |
| Card Numbers | Never stored | Via Paystack |
| Crypto Keys | Provider managed | Via NOWPayments |

### Environment Variables

```bash
# Never commit these to git
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
PAYSTACK_SECRET_KEY=...
NOWPAYMENTS_API_KEY=...
NOWPAYMENTS_IPN_SECRET=...
```

**Best Practices:**
- Use `.env.example` with placeholder values
- Add `.env` to `.gitignore`
- Use secrets manager in production (AWS Secrets Manager, HashiCorp Vault)

### Logging Security

```typescript
// DO log
logger.info('User logged in', { userId: user.id });
logger.info('Transaction created', { reference, amount });

// DO NOT log
logger.info('Login attempt', { email, password }); // NEVER
logger.info('Token generated', { token }); // NEVER
logger.info('Webhook payload', { payload }); // Careful with PII
```

---

## Error Handling

### Safe Error Responses

```typescript
// Internal error - hide details
if (err instanceof DatabaseError) {
  logger.error('Database error', { error: err, stack: err.stack });
  return res.status(500).json({
    success: false,
    error: 'Internal server error'  // Generic message
  });
}

// Validation error - show details
if (err instanceof ValidationError) {
  return res.status(400).json({
    success: false,
    error: err.message  // Safe to show
  });
}
```

### Error Classes

```typescript
// Domain errors - safe to expose message
export class ValidationError extends Error {}
export class ConflictError extends Error {}
export class NotFoundError extends Error {}
export class InsufficientBalanceError extends Error {}

// System errors - never expose details
export class DatabaseError extends Error {}
export class ExternalServiceError extends Error {}
```

---

## Threat Model

### OWASP Top 10 Mitigations

| Threat | Mitigation |
|--------|------------|
| **A01: Broken Access Control** | JWT auth, role-based access, ownership checks |
| **A02: Cryptographic Failures** | bcrypt passwords, HTTPS, secure cookies |
| **A03: Injection** | Prisma ORM, Zod validation |
| **A04: Insecure Design** | Ledger-first, double-entry, immutability |
| **A05: Security Misconfiguration** | Environment-based config, secure defaults |
| **A06: Vulnerable Components** | Regular npm audit, dependency updates |
| **A07: Auth Failures** | Token rotation, rate limiting, secure storage |
| **A08: Data Integrity Failures** | Webhook signatures, idempotency |
| **A09: Logging Failures** | Winston logging, no sensitive data |
| **A10: SSRF** | URL validation, allowlists |

### Attack Scenarios

#### 1. Stolen Access Token
- **Mitigation:** 5-minute expiry limits damage window
- **Detection:** Monitor for unusual API patterns

#### 2. Stolen Refresh Token
- **Mitigation:** Single-use tokens, database revocation
- **Detection:** Alert on token reuse attempts

#### 3. Webhook Replay
- **Mitigation:** Idempotency keys, signature verification
- **Detection:** Log duplicate webhook attempts

#### 4. Balance Manipulation
- **Mitigation:** Derived balances, atomic transactions
- **Detection:** Ledger reconciliation checks

---

## Security Checklist

### Development
- [ ] All inputs validated with Zod
- [ ] Passwords hashed with bcrypt (cost 12+)
- [ ] Secrets in environment variables
- [ ] No sensitive data in logs
- [ ] Error messages don't leak internals

### Deployment
- [ ] HTTPS enforced
- [ ] Secure cookie flags enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers set (Helmet)

### Operations
- [ ] Regular dependency updates
- [ ] npm audit in CI/CD
- [ ] Log monitoring for anomalies
- [ ] Webhook signature verification
- [ ] Database backups encrypted

---

## Security Headers (To Implement)

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

## Incident Response

### Suspected Breach

1. **Immediate:** Revoke all refresh tokens
2. **Investigate:** Review logs for affected accounts
3. **Contain:** Freeze affected wallets if needed
4. **Notify:** Inform affected users
5. **Remediate:** Patch vulnerability
6. **Review:** Post-mortem and improvements

### Emergency Token Revocation

```typescript
// Revoke all tokens for a user
await prisma.refresh_tokens.updateMany({
  where: { user_id: userId },
  data: { is_revoked: true }
});

// Revoke all tokens system-wide (nuclear option)
await prisma.refresh_tokens.updateMany({
  where: { is_revoked: false },
  data: { is_revoked: true }
});
```
