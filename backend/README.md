# Zorex Pay

### A Production-Grade Multi-Currency Payment Backend

Zorex Pay is a complete backend system for handling **multi-currency payments** using a **ledger-first architecture**. It supports both fiat (NGN via Paystack) and cryptocurrency (BTC, ETH, USDT, BNB, TRX via NOWPayments).

**Status: ✅ Complete - All core features implemented and tested**

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Start development server
pnpm dev
```

Server runs at `http://localhost:5500`

---

## Features

### Authentication
- ✅ JWT-based auth with token rotation
- ✅ httpOnly cookies for security
- ✅ Access tokens (5 min) + Refresh tokens (24 hr)
- ✅ Token revocation support

### Wallets
- ✅ Multi-currency wallets (NGN, USDT, BTC, ETH, BNB, TRX)
- ✅ Automatic NGN wallet on registration
- ✅ Balance calculation from ledger entries
- ✅ Network-specific deposit addresses

### Funding
- ✅ NGN deposits via Paystack
- ✅ Crypto deposits via NOWPayments
- ✅ Automatic deposit address generation
- ✅ Webhook signature verification

### Withdrawals
- ✅ Crypto withdrawals to external wallets
- ✅ Fee estimation endpoints
- ✅ Withdrawal cancellation
- ✅ Payout webhook handling

### Transfers
- ✅ Internal transfers (between own wallets)
- ✅ P2P transfers (to other users)
- ✅ Transfer history

### Transactions
- ✅ Full transaction history
- ✅ Filtering by type/status/wallet
- ✅ Pagination support
- ✅ Transaction statistics

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/register | Create account |
| POST | /api/login | Login |
| POST | /api/refresh | Refresh token |
| POST | /api/logout | Logout |

### Wallets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/wallets | List wallets |
| POST | /api/wallets | Create wallet |
| GET | /api/wallets/:id | Get wallet |
| GET | /api/wallets/:id/balance | Get balance |
| GET | /api/wallets/:id/deposit-address | Get deposit address |
| GET | /api/wallets/networks/:currency | Get networks |

### Funding & Withdrawals
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/fund-bank | Fund via Paystack |
| POST | /api/withdraw/crypto | Withdraw crypto |
| POST | /api/withdraw/crypto/estimate | Get fee estimate |
| GET | /api/withdraw/crypto/pending | Pending withdrawals |

### Transfers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/transfers/internal | Internal transfer |
| POST | /api/transfers/send | Send to user |
| GET | /api/transfers/history | Transfer history |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/transactions | List transactions |
| GET | /api/transactions/:id | Get transaction |
| GET | /api/transactions/stats | Get statistics |

---

## Design Principles

### 1. Ledger-First Architecture

**Balances are NEVER stored.** They are always calculated:

```
Balance = SUM(CREDIT entries) - SUM(DEBIT entries)
```

### 2. Double-Entry Bookkeeping

Every financial operation creates balanced entries:
- Funding: CREDIT user, DEBIT settlement
- Withdrawal: DEBIT user, CREDIT settlement
- Transfer: DEBIT sender, CREDIT receiver

### 3. Atomic Transactions

All financial writes use database transactions to ensure consistency:

```typescript
await prisma.$transaction(async (tx) => {
  // Create transaction record
  // Create ledger entries
  // All succeed or all fail
});
```

### 4. Idempotency

All operations use unique references to prevent duplicates.

---

## Supported Assets

### Currencies
- NGN (Nigerian Naira)
- USDT (Tether)
- BTC (Bitcoin)
- ETH (Ethereum)
- BNB (Binance Coin)
- TRX (Tron)

### Networks
| Currency | Networks |
|----------|----------|
| NGN | BANK |
| USDT | TRC20, BEP20, ERC20, POLYGON |
| BTC | BTC |
| ETH | ERC20 |
| BNB | BEP20 |
| TRX | TRC20 |

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/zorex_pay

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxxxx

# NOWPayments
NOWPAYMENTS_API_KEY=your-api-key
NOWPAYMENTS_IPN_SECRET=your-ipn-secret

# System
SYSTEM_SETTLEMENT_LEDGER_ID=uuid
SYSTEM_FEE_LEDGER_ID=uuid
API_URL=http://localhost:5500
PORT=5500
```

---

## Project Structure

```
backend/
├── controllers/     # HTTP handlers
├── services/        # Business logic
├── repository/      # Data access
├── routes/          # API routes
├── middleware/      # Auth, errors
├── errors/          # Domain errors
├── prisma/          # Database schema
├── docs/            # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── FLOWS.md
│   ├── IMPLEMENTATION.md
│   └── SECURITY.md
└── index.ts         # Entry point
```

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and components
- [API Specification](docs/API.md) - Full endpoint documentation
- [Database Schema](docs/DATABASE.md) - Tables and relationships
- [Transaction Flows](docs/FLOWS.md) - User journeys
- [Implementation](docs/IMPLEMENTATION.md) - Current status
- [Security](docs/SECURITY.md) - Auth and threat model

---

## Technology Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** JWT (httpOnly cookies)
- **Validation:** Zod
- **Payments:** Paystack, NOWPayments

---

## License

MIT
