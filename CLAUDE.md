# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zorex Pay is a full-stack payment system with production-grade ledger-first architecture. It handles multi-currency wallets, fiat/crypto funding, and auditable transactions. 

## Development Commands

### Backend (from `/backend`)
```bash
pnpm install          # Install dependencies
pnpm dev              # Run dev server with hot reload (nodemon + tsx)
pnpm prisma generate  # Generate Prisma client after schema changes
pnpm prisma migrate dev --name <name>  # Create and apply migration
```

### Frontend (from `/frontend`)
```bash
pnpm install          # Install dependencies
pnpm dev              # Run Next.js dev server
pnpm build            # Production build
pnpm lint             # Run ESLint
```

## Architecture

### Code Flow Pattern
```
HTTP Request → Route → Controller → Service → Repository → Prisma → PostgreSQL
```

- **Controllers**: Handle HTTP, delegate to services, return JSON
- **Services**: Business logic, validation (Zod), orchestration
- **Repositories**: Data access via Prisma, transaction management

### Ledger-First Design (Critical)

**Balances are NEVER stored directly.** They are always derived from ledger entries.

Key tables:
- `wallets` - One per user per currency (NGN, USDT, BTC, ETH, BNB, TRX). No balance field.
- `ledger_accounts` - Tied to wallets. Types: USER, SYSTEM, FEE, SETTLEMENT
- `ledger_entries` - Immutable CREDIT/DEBIT records. This is the source of truth.
- `transactions` - Atomic units (FUNDING/PAYOUT/TRANSFER/PAYMENT) with status lifecycle

Double-entry bookkeeping: Every financial operation creates balanced entries (credits = debits).

### Authentication

JWT-based with token rotation:
- Access token: 5 min expiry, httpOnly cookie
- Refresh token: 24 hours, stored in DB for revocation
- See `services/auth/` for token generation and cookie management

### External Integration

Paystack handles NGN bank funding:
- `services/funding/paystack.service.ts` - Initialize payments
- `controllers/webhooks/paystack.webhook.ts` - Handle charge confirmations
- Webhooks verify HMAC-SHA512 signatures

## Key Patterns

### Idempotency
All financial writes use unique transaction references. Duplicate requests safely reuse existing transactions via upsert patterns.

### Atomic Transactions
Financial operations use Prisma's `$transaction()` to ensure all-or-nothing execution:
```typescript
await prisma.$transaction(async (tx) => {
  // Multiple operations that succeed or fail together
});
```

### Error Handling
Domain errors in `errors/domain.errors.ts` (ValidationError, ConflictError, LoginError) map to HTTP status codes via `controllers/error.handler.ts`.

## Configuration

- `config/default.json` - Base config
- `config/development.json` / `config/production.json` - Environment overrides
- `config/custom-environment-variables.json` - Maps env vars to config keys
- Environment variables in `.env` (DATABASE_URL, JWT keys, Paystack secrets)

## Database

PostgreSQL with Prisma 7. Schema at `backend/prisma/schema.prisma`.

Currency/network are separate concerns - `USDT` on `ERC20` vs `USDT` on `TRC20` are distinct funding paths.
