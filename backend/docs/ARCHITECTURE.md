# Zorex Pay - System Architecture

## Overview

Zorex Pay is a multi-currency payment platform supporting both fiat (NGN) and cryptocurrency (BTC, ETH, USDT, BNB, TRX) transactions. The system uses a **ledger-first architecture** where balances are never stored directly but always derived from immutable ledger entries.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   Web App       │  │   Mobile App    │  │   Admin Panel   │             │
│  │   (Next.js)     │  │   (Future)      │  │   (Future)      │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
└───────────┼────────────────────┼────────────────────┼───────────────────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │ HTTPS/REST
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Express.js Server                                                   │   │
│  │  • Authentication (JWT)                                              │   │
│  │  • Rate Limiting                                                     │   │
│  │  • Request Validation                                                │   │
│  │  • CORS                                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYER                                 │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Routes     │→ │ Controllers  │→ │  Services    │→ │ Repositories │   │
│  │              │  │              │  │              │  │              │   │
│  │ • /auth/*    │  │ Handle HTTP  │  │ Business     │  │ Data Access  │   │
│  │ • /wallets/* │  │ Delegate     │  │ Logic        │  │ Prisma ORM   │   │
│  │ • /tx/*      │  │ to services  │  │ Validation   │  │ Transactions │   │
│  │ • /webhooks/*│  │ Return JSON  │  │ Orchestration│  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Cross-Cutting Concerns                                              │   │
│  │  • Error Handling (domain errors → HTTP status)                      │   │
│  │  • Logging (Winston)                                                 │   │
│  │  • Validation (Zod schemas)                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Prisma ORM
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                                                 │   │
│  │                                                                      │   │
│  │  Core Tables:                                                        │   │
│  │  • users              - User accounts                                │   │
│  │  • wallets            - Currency wallets (no balance field!)         │   │
│  │  • ledger_accounts    - Account entries point                        │   │
│  │  • ledger_entries     - Immutable CREDIT/DEBIT records              │   │
│  │  • transactions       - Atomic financial operations                  │   │
│  │  • payment_accounts   - Bank/crypto addresses                        │   │
│  │  • refresh_tokens     - Session management                           │   │
│  │  • rates              - Currency conversion rates                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Webhooks / API Calls
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                    │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │    Paystack      │  │   NOWPayments    │  │  Price Feeds     │         │
│  │                  │  │                  │  │                  │         │
│  │  • NGN deposits  │  │  • Crypto deps   │  │  • Exchange      │         │
│  │  • Bank transfers│  │  • Crypto payouts│  │    rates         │         │
│  │  • Webhooks      │  │  • Address gen   │  │  • Real-time     │         │
│  │                  │  │  • IPN callbacks │  │    updates       │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                             │
│  Licensed payment processors handle actual fund movement                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Design Principles

### 1. Ledger-First Architecture

**Balances are NEVER stored.** They are always calculated from ledger entries.

```
Balance = SUM(CREDIT entries) - SUM(DEBIT entries)
```

Benefits:
- **Auditability**: Complete history of every balance change
- **Correctness**: Balance cannot drift from reality
- **Recovery**: Rebuild any balance at any point in time
- **Compliance**: Full transaction trail for regulators

### 2. Double-Entry Bookkeeping

Every financial operation affects at least two accounts:

```
[User deposits 10,000 NGN]
├── CREDIT: User's ledger account     +10,000
└── DEBIT:  Settlement account        -10,000
            ──────────────────────────────────
            NET: 0 (always balanced)
```

### 3. Idempotency

All financial operations use unique reference keys. Safe to retry any operation.

```typescript
// Duplicate webhooks are safe
const transaction = await tx.transactions.upsert({
  where: { reference },
  create: { /* ... */ },
  update: {}  // No update - idempotent
});
```

### 4. Atomic Transactions

All multi-step operations use database transactions:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Update transaction status
  // 2. Create credit entry
  // 3. Create debit entry
  // ALL succeed or ALL fail
});
```

### 5. Licensed Partner Integration

**Critical for regulatory compliance:**
- We do NOT directly process payments or hold funds
- Paystack (licensed PSSP) handles NGN bank transactions
- NOWPayments handles cryptocurrency operations
- Platform tracks internal balances only

## Component Architecture

### Authentication Flow

```
┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐
│ Client │       │  API   │       │ Service│       │   DB   │
└───┬────┘       └───┬────┘       └───┬────┘       └───┬────┘
    │                │                │                │
    │  POST /login   │                │                │
    │───────────────>│                │                │
    │                │  validate()    │                │
    │                │───────────────>│                │
    │                │                │  findUser()    │
    │                │                │───────────────>│
    │                │                │<───────────────│
    │                │                │  bcrypt.compare│
    │                │                │                │
    │                │  tokens        │                │
    │                │<───────────────│                │
    │                │                │  saveRefresh() │
    │                │                │───────────────>│
    │  Set-Cookie    │                │                │
    │<───────────────│                │                │
    │                │                │                │
```

**Token Strategy:**
- Access Token: 5 minutes, httpOnly cookie
- Refresh Token: 24 hours, httpOnly cookie, stored in DB
- Token rotation on refresh (old token invalidated)

### Funding Flow (Fiat - NGN)

```
┌────────┐     ┌────────┐     ┌──────────┐     ┌────────┐
│ Client │     │  API   │     │ Paystack │     │   DB   │
└───┬────┘     └───┬────┘     └────┬─────┘     └───┬────┘
    │              │               │               │
    │ POST /fund   │               │               │
    │─────────────>│               │               │
    │              │ Create PENDING transaction    │
    │              │──────────────────────────────>│
    │              │               │               │
    │              │ initialize()  │               │
    │              │──────────────>│               │
    │              │               │               │
    │              │ auth_url      │               │
    │              │<──────────────│               │
    │ redirect     │               │               │
    │<─────────────│               │               │
    │              │               │               │
    │══════════════│═══════════════│═══════════════│══════
    │ User pays via Paystack       │               │
    │══════════════│═══════════════│═══════════════│══════
    │              │               │               │
    │              │ POST /webhook │               │
    │              │<──────────────│               │
    │              │ Verify HMAC   │               │
    │              │               │               │
    │              │ Update tx + Create ledger entries
    │              │──────────────────────────────>│
    │              │               │               │
```

### Funding Flow (Crypto)

```
┌────────┐     ┌────────┐     ┌─────────────┐     ┌────────┐
│ Client │     │  API   │     │ NOWPayments │     │   DB   │
└───┬────┘     └───┬────┘     └──────┬──────┘     └───┬────┘
    │              │                 │                │
    │ GET /deposit-address           │                │
    │─────────────>│                 │                │
    │              │ Check existing address           │
    │              │─────────────────────────────────>│
    │              │                 │                │
    │              │ create_payment()│                │
    │              │────────────────>│                │
    │              │                 │                │
    │              │ pay_address     │                │
    │              │<────────────────│                │
    │              │                 │                │
    │              │ Store address   │                │
    │              │─────────────────────────────────>│
    │ address      │                 │                │
    │<─────────────│                 │                │
    │              │                 │                │
    │══════════════│═════════════════│════════════════│══════
    │ User sends crypto to address   │                │
    │══════════════│═════════════════│════════════════│══════
    │              │                 │                │
    │              │ IPN callback    │                │
    │              │<────────────────│                │
    │              │ Verify signature│                │
    │              │                 │                │
    │              │ Update tx + Create ledger entries│
    │              │─────────────────────────────────>│
```

### Transfer Flow (Internal)

```
┌────────┐     ┌────────┐     ┌────────┐
│ Client │     │  API   │     │   DB   │
└───┬────┘     └───┬────┘     └───┬────┘
    │              │               │
    │ POST /transfer               │
    │─────────────>│               │
    │              │               │
    │              │ $transaction {│
    │              │   1. Check sender balance
    │              │   2. Create TRANSFER transaction
    │              │   3. DEBIT sender ledger
    │              │   4. CREDIT recipient ledger
    │              │ }             │
    │              │──────────────>│
    │              │               │
    │  success     │               │
    │<─────────────│               │
```

## Directory Structure

```
backend/
├── index.ts                 # Express app entry point
├── logger.ts                # Winston logging config
├── lib/
│   └── prisma.ts            # Prisma client singleton
├── config/
│   ├── default.json         # Base configuration
│   ├── development.json     # Dev overrides
│   ├── production.json      # Prod overrides
│   └── custom-environment-variables.json
├── prisma/
│   └── schema.prisma        # Database schema
├── routes/
│   ├── auth/                # Authentication routes
│   ├── wallets/             # Wallet management routes
│   ├── transactions/        # Transaction routes
│   ├── funding/             # Funding routes
│   └── webhooks/            # External webhook handlers
├── controllers/
│   ├── auth/                # Auth request handlers
│   ├── wallets/             # Wallet request handlers
│   ├── transactions/        # Transaction handlers
│   ├── funding/             # Funding handlers
│   ├── webhooks/            # Webhook handlers
│   └── error.handler.ts     # Global error handler
├── services/
│   ├── auth/                # Auth business logic
│   ├── wallet/              # Wallet operations
│   ├── ledger/              # Ledger operations
│   ├── funding/             # Funding services
│   │   ├── paystack.ts      # NGN via Paystack
│   │   └── nowpayments.ts   # Crypto via NOWPayments
│   ├── transfer/            # Internal transfers
│   ├── payout/              # Withdrawals
│   └── webhooks/            # Webhook processing
├── repository/
│   ├── user.repo.ts         # User data access
│   ├── wallet.repo.ts       # Wallet data access
│   ├── ledger/
│   │   └── ledger.repo.ts   # Ledger operations
│   ├── transaction.repo.ts  # Transaction data access
│   └── refresh.repo.ts      # Token data access
├── middleware/
│   ├── auth.ts              # JWT verification
│   ├── validate.ts          # Request validation
│   └── errors.ts            # Error middleware
├── validators/
│   └── *.schema.ts          # Zod validation schemas
├── errors/
│   └── domain.errors.ts     # Custom error classes
└── models/
    └── *.model.ts           # TypeScript interfaces
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Node.js 20+ | JavaScript runtime |
| Framework | Express 5 | HTTP server |
| Language | TypeScript | Type safety |
| Database | PostgreSQL | Primary data store |
| ORM | Prisma 7 | Database access |
| Auth | JWT + bcrypt | Authentication |
| Validation | Zod | Input validation |
| Logging | Winston | Application logs |
| Fiat Payments | Paystack | NGN transactions |
| Crypto Payments | NOWPayments | Cryptocurrency |

## Security Considerations

1. **Secrets Management**: Environment variables, never in code
2. **Password Storage**: bcrypt with cost factor 12
3. **Session Security**: httpOnly cookies, secure flag in production
4. **Webhook Verification**: HMAC signature validation
5. **Input Validation**: Zod schemas on all inputs
6. **SQL Injection**: Prisma parameterized queries
7. **Rate Limiting**: Protect against brute force (to implement)
8. **CORS**: Whitelist allowed origins

## Scalability Considerations

1. **Stateless API**: Horizontal scaling ready
2. **Database Pooling**: Prisma connection pool
3. **Async Processing**: Webhook queue for reliability
4. **Caching**: Redis for rate data (future)
5. **Read Replicas**: PostgreSQL replication (future)
