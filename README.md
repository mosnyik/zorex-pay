# Zorex Pay

A **production-grade multi-currency payment platform** supporting fiat (NGN) and cryptocurrency (BTC, ETH, USDT, BNB, TRX) transactions with a ledger-first architecture.

> **Note:** This is a portfolio project demonstrating payment system architecture. It does not process real funds.

---

## Key Features

- **Multi-Currency Wallets** - NGN, USDT, BTC, ETH, BNB, TRX
- **Ledger-First Design** - Balances derived from immutable ledger entries
- **Double-Entry Bookkeeping** - Every transaction is balanced and auditable
- **Fiat Integration** - NGN deposits via Paystack
- **Crypto Integration** - Deposits/withdrawals via NOWPayments
- **Internal Transfers** - Instant wallet-to-wallet transfers
- **JWT Authentication** - Secure token rotation with refresh tokens

---

## Architecture Highlights

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│   Backend API   │────▶│   PostgreSQL    │
│    (Next.js)    │     │   (Express)     │     │   (Ledger DB)   │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
           ┌─────────────────┐       ┌─────────────────┐
           │    Paystack     │       │  NOWPayments    │
           │   (NGN Fiat)    │       │    (Crypto)     │
           └─────────────────┘       └─────────────────┘
```

**Core Principles:**
- Balances are NEVER stored directly - always calculated from ledger entries
- All financial operations are atomic (all-or-nothing)
- Idempotency keys prevent duplicate transactions
- Webhooks are signature-verified before processing

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL, Prisma 7 |
| Auth | JWT, bcrypt |
| Validation | Zod |
| Fiat Payments | Paystack |
| Crypto Payments | NOWPayments |
| Frontend | Next.js 16, React 19, Tailwind |

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./docs/ARCHITECTURE.md) | System design, components, principles |
| [Database](./docs/DATABASE.md) | Schema, tables, relationships, queries |
| [API Specification](./docs/API.md) | Complete REST API reference |
| [Business Flows](./docs/FLOWS.md) | User journeys, transaction flows |
| [Security Model](./docs/SECURITY.md) | Auth, threats, mitigations |
| [Implementation Plan](./docs/IMPLEMENTATION.md) | Status, phases, code examples |

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- pnpm

### Backend Setup

```bash
cd backend

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your database URL and API keys

# Setup database
pnpm prisma generate
pnpm prisma migrate dev

# Run development server
pnpm dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/zorex_pay

# JWT Secrets
JWT_ACCESS_SECRET=your-32-char-min-secret
JWT_REFRESH_SECRET=your-32-char-min-secret

# Paystack (NGN)
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_PUBLIC_KEY=pk_test_xxx

# NOWPayments (Crypto)
NOWPAYMENTS_API_KEY=your-api-key
NOWPAYMENTS_IPN_SECRET=your-ipn-secret

# System
SYSTEM_SETTLEMENT_LEDGER_ID=uuid-of-settlement-account
API_URL=http://localhost:5500
FRONTEND_URL=http://localhost:3000
PORT=5500
```

---

## API Endpoints

### Authentication
- `POST /api/register` - Create account
- `POST /api/login` - Authenticate
- `POST /api/refresh` - Refresh tokens
- `POST /api/logout` - End session

### Wallets
- `GET /api/wallets` - List user wallets
- `POST /api/wallets` - Create new wallet
- `GET /api/wallets/:id` - Wallet details
- `GET /api/wallets/:id/transactions` - Transaction history

### Funding
- `POST /api/funding/bank` - NGN via Paystack
- `GET /api/funding/crypto/address` - Get deposit address

### Transfers
- `POST /api/transfers` - Wallet-to-wallet transfer
- `POST /api/transfers/username` - Transfer by username

### Payouts
- `POST /api/payouts/bank` - NGN withdrawal
- `POST /api/payouts/crypto` - Crypto withdrawal

### Webhooks
- `POST /api/webhooks/paystack` - Paystack notifications
- `POST /api/webhooks/nowpayments` - NOWPayments notifications

---

## Project Structure

```
zorex-pay/
├── backend/
│   ├── controllers/      # HTTP request handlers
│   ├── services/         # Business logic
│   ├── repository/       # Data access layer
│   ├── middleware/       # Auth, validation
│   ├── routes/           # Express routes
│   ├── prisma/           # Database schema
│   ├── errors/           # Domain errors
│   ├── validators/       # Zod schemas
│   └── models/           # TypeScript types
├── frontend/
│   ├── app/              # Next.js app router
│   └── components/       # React components
├── docs/                 # Documentation
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── FLOWS.md
│   ├── SECURITY.md
│   └── IMPLEMENTATION.md
└── README.md
```

---

## Implementation Status

| Feature | Status |
|---------|--------|
| Database Schema | Complete |
| Authentication | Complete |
| NGN Funding (Paystack) | Complete |
| Crypto Funding | In Progress |
| Internal Transfers | In Progress |
| Payouts | In Progress |
| Admin Dashboard | Planned |

See [Implementation Plan](./docs/IMPLEMENTATION.md) for detailed status.

---

## Design Decisions

### Why Ledger-First?

Traditional approach stores balance as a field:
```
wallet.balance = 10000  // Vulnerable to drift, no audit trail
```

Ledger-first approach derives balance:
```sql
SELECT SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END)
FROM ledger_entries WHERE wallet_id = ?
-- Always accurate, fully auditable
```

### Why Double-Entry?

Every transaction affects two accounts:
```
User deposits 10,000 NGN:
├── CREDIT: User wallet    +10,000
└── DEBIT:  Settlement     -10,000
            ──────────────────────
            NET: 0 (always balanced)
```

This ensures:
- No money created from nothing
- Complete audit trail
- Easy reconciliation

### Why Token Rotation?

Each refresh token is single-use:
1. User refreshes → new tokens issued
2. Old refresh token marked as revoked
3. Prevents token reuse attacks
4. Enables session tracking

---

## Contributing

This is a portfolio project. Feel free to explore and learn from the code.

---

## License

MIT
