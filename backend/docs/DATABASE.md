# Zorex Pay - Database Design

## Overview

The database is designed around a **ledger-first architecture** where financial balances are never stored directly but calculated from immutable ledger entries. This ensures complete auditability and data integrity.

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│     users       │       │ refresh_tokens  │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │
│ first_name      │  │    │ user_id (FK)    │──┐
│ last_name       │  │    │ token           │  │
│ user_name (UQ)  │  │    │ is_revoked      │  │
│ email (UQ)      │  │    │ expires_at      │  │
│ phone (UQ)      │  │    │ replaced_by     │  │
│ password_hash   │  │    │ created_at      │  │
│ role            │  │    └─────────────────┘  │
│ kyc_status      │  │                         │
│ created_at      │  └─────────────────────────┘
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│     wallets     │       │payment_accounts │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │
│ user_id (FK)    │  │    │ wallet_id (FK)  │──┐
│ currency        │  │    │ network         │  │
│ status          │  │    │ identifier (UQ) │  │
│ created_at      │  │    │ provider        │  │
│                 │  │    │ is_active       │  │
│ (UQ: user+curr) │  │    │ created_at      │  │
└────────┬────────┘  │    └─────────────────┘  │
         │           │                         │
         │           └─────────────────────────┘
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│ ledger_accounts │       │ ledger_entries  │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │
│ wallet_id (FK)  │  │    │ transaction_id  │──┐
│ currency        │  │    │ ledger_acct_id  │  │
│ created_at      │  │    │ direction       │  │
│                 │  │    │ amount          │  │
│                 │  │    │ created_at      │  │
└─────────────────┘  │    └─────────────────┘  │
                     │                         │
                     └─────────────────────────┘
                                               │
┌─────────────────┐                            │
│  transactions   │                            │
├─────────────────┤                            │
│ id (PK)         │────────────────────────────┘
│ type            │
│ status          │
│ reference (UQ)  │
│ metadata        │
│ created_at      │
└─────────────────┘

┌─────────────────┐
│     rates       │
├─────────────────┤
│ id (PK)         │
│ currency_from   │
│ currency_to     │
│ current_rate    │
│ merchant_rate   │
│ updated_at      │
└─────────────────┘
```

## Table Definitions

### users

Stores user account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid() | Unique identifier |
| first_name | VARCHAR(100) | NOT NULL | User's first name |
| last_name | VARCHAR(100) | NOT NULL | User's last name |
| user_name | VARCHAR(50) | UNIQUE, NOT NULL | Display username |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| phone | VARCHAR(50) | UNIQUE, NOT NULL | Phone number |
| password_hash | TEXT | NOT NULL | bcrypt hashed password |
| role | ENUM | DEFAULT 'USER' | USER, MERCHANT, ADMIN |
| kyc_status | ENUM | DEFAULT 'UNVERIFIED' | UNVERIFIED, PENDING, VERIFIED |
| created_at | TIMESTAMP | DEFAULT now() | Account creation time |

**Indexes:**
- `email` (unique, implicit)
- `user_name` (unique, implicit)
- `phone` (unique, implicit)

---

### wallets

One wallet per user per currency. **No balance field** - balances derived from ledger.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id | Owner |
| currency | ENUM | NOT NULL | NGN, USDT, BTC, ETH, BNB, TRX |
| status | ENUM | DEFAULT 'ACTIVE' | ACTIVE, FROZEN |
| created_at | TIMESTAMP | DEFAULT now() | Creation time |

**Constraints:**
- `UNIQUE(user_id, currency)` - One wallet per currency per user

**Indexes:**
- `idx_wallet_user` on (user_id)
- `idx_wallet_currency` on (currency)

---

### payment_accounts

External identifiers (bank accounts, crypto addresses) linked to wallets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| wallet_id | UUID | FK → wallets.id | Parent wallet |
| network | ENUM | NOT NULL | BANK, TRC20, BEP20, POLYGON, ERC20, BTC |
| identifier | VARCHAR | NOT NULL | Account number or address |
| provider | VARCHAR | NULL | Paystack, NOWPayments, etc. |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_at | TIMESTAMP | DEFAULT now() | Creation time |

**Constraints:**
- `UNIQUE(network, identifier)` - No duplicate addresses

---

### ledger_accounts

Entry point for ledger operations. Each wallet has one ledger account.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| wallet_id | UUID | FK → wallets.id | Parent wallet |
| currency | ENUM | NOT NULL | Currency type |
| created_at | TIMESTAMP | DEFAULT now() | Creation time |

**Account Types (via system accounts):**
- USER - User wallet accounts
- SYSTEM - Platform clearing account
- FEE - Fee collection account
- SETTLEMENT - External settlement account

---

### ledger_entries

**Immutable** double-entry records. Source of truth for all balances.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| transaction_id | UUID | FK → transactions.id | Parent transaction |
| ledger_account_id | UUID | FK → ledger_accounts.id | Target account |
| direction | ENUM | NOT NULL | CREDIT (+) or DEBIT (-) |
| amount | DECIMAL(18,7) | NOT NULL | Entry amount |
| created_at | TIMESTAMP | DEFAULT now() | Creation time |

**Critical Rules:**
1. Entries are NEVER updated or deleted
2. Every transaction creates balanced entries (sum = 0)
3. Balance = SUM(CREDIT) - SUM(DEBIT) for any account

---

### transactions

Atomic financial operations with lifecycle tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| type | ENUM | NOT NULL | FUNDING, PAYOUT, TRANSFER, PAYMENT |
| status | ENUM | DEFAULT 'PENDING' | PENDING, COMPLETED, FAILED, REVERSED |
| reference | VARCHAR(100) | UNIQUE | Idempotency key |
| metadata | JSONB | NULL | Additional data |
| created_at | TIMESTAMP | DEFAULT now() | Creation time |

**Indexes:**
- `idx_tx_reference` on (reference)
- `idx_tx_status` on (status)
- `idx_tx_type` on (type)

**Transaction Types:**
| Type | Description | Flow |
|------|-------------|------|
| FUNDING | External deposit | External → Wallet |
| PAYOUT | External withdrawal | Wallet → External |
| TRANSFER | Internal transfer | Wallet → Wallet |
| PAYMENT | Service payment | Wallet → Merchant |

**Status Lifecycle:**
```
PENDING ──┬──► COMPLETED ──► REVERSED
          │
          └──► FAILED
```

---

### refresh_tokens

JWT refresh token tracking for session management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id | Token owner |
| token | VARCHAR(255) | NOT NULL | JWT token |
| is_revoked | BOOLEAN | DEFAULT false | Revocation status |
| created_at | TIMESTAMP | DEFAULT now() | Issue time |
| expires_at | TIMESTAMP | NOT NULL | Expiration time |
| replaced_by_token | VARCHAR(255) | NULL | Rotation tracking |

**Indexes:**
- `idx_token_tokens` on (token)

---

### rates

Currency exchange rates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| currency_from | VARCHAR(20) | NOT NULL | Source currency |
| currency_to | VARCHAR(20) | NOT NULL | Target currency |
| current_rate | DECIMAL(18,7) | NOT NULL | Current exchange rate |
| merchant_rate | DECIMAL(18,7) | NOT NULL | Rate for merchants |
| updated_at | TIMESTAMP | AUTO | Last update time |

---

## Enums

### currency_type
```sql
NGN    -- Nigerian Naira
USDT   -- Tether USD
BTC    -- Bitcoin
ETH    -- Ethereum
BNB    -- Binance Coin
TRX    -- Tron
```

### network_type
```sql
BANK     -- Traditional bank
TRC20    -- Tron network tokens
BEP20    -- Binance Smart Chain tokens
POLYGON  -- Polygon network
ERC20    -- Ethereum network tokens
BTC      -- Bitcoin network
```

### transaction_type
```sql
FUNDING   -- External deposit
PAYOUT    -- External withdrawal
TRANSFER  -- Internal transfer
PAYMENT   -- Service payment
```

### transaction_status
```sql
PENDING    -- Awaiting confirmation
COMPLETED  -- Successfully processed
FAILED     -- Processing failed
REVERSED   -- Completed but reversed
```

### wallet_status
```sql
ACTIVE  -- Normal operations
FROZEN  -- Operations blocked
```

### user_role
```sql
USER      -- Regular user
MERCHANT  -- Business account
ADMIN     -- Administrator
```

### kyc_status
```sql
UNVERIFIED  -- No KYC submitted
PENDING     -- KYC under review
VERIFIED    -- KYC approved
```

### ledger_direction
```sql
CREDIT  -- Money in (+)
DEBIT   -- Money out (-)
```

---

## Key Queries

### Calculate Wallet Balance

```sql
SELECT
  SUM(CASE WHEN le.direction = 'CREDIT' THEN le.amount ELSE 0 END) -
  SUM(CASE WHEN le.direction = 'DEBIT' THEN le.amount ELSE 0 END) AS balance
FROM ledger_entries le
JOIN ledger_accounts la ON le.ledger_account_id = la.id
WHERE la.wallet_id = $1;
```

### Get User's All Wallets with Balances

```sql
SELECT
  w.id,
  w.currency,
  w.status,
  COALESCE(
    SUM(CASE WHEN le.direction = 'CREDIT' THEN le.amount ELSE 0 END) -
    SUM(CASE WHEN le.direction = 'DEBIT' THEN le.amount ELSE 0 END),
    0
  ) AS balance
FROM wallets w
LEFT JOIN ledger_accounts la ON la.wallet_id = w.id
LEFT JOIN ledger_entries le ON le.ledger_account_id = la.id
WHERE w.user_id = $1
GROUP BY w.id, w.currency, w.status;
```

### Transaction History for Wallet

```sql
SELECT
  t.id,
  t.type,
  t.status,
  t.reference,
  le.direction,
  le.amount,
  t.created_at
FROM transactions t
JOIN ledger_entries le ON le.transaction_id = t.id
JOIN ledger_accounts la ON le.ledger_account_id = la.id
WHERE la.wallet_id = $1
ORDER BY t.created_at DESC
LIMIT 50;
```

### Check Balance Before Debit

```sql
WITH balance AS (
  SELECT
    SUM(CASE WHEN le.direction = 'CREDIT' THEN le.amount ELSE 0 END) -
    SUM(CASE WHEN le.direction = 'DEBIT' THEN le.amount ELSE 0 END) AS available
  FROM ledger_entries le
  JOIN ledger_accounts la ON le.ledger_account_id = la.id
  WHERE la.wallet_id = $1
)
SELECT available >= $2 AS has_sufficient_balance
FROM balance;
```

---

## Double-Entry Examples

### Funding (External → User)

```
Transaction: FUNDING, amount: 10,000 NGN

Entries:
┌─────────────────────┬───────────┬────────────┐
│ Account             │ Direction │ Amount     │
├─────────────────────┼───────────┼────────────┤
│ User Ledger Account │ CREDIT    │ +10,000.00 │
│ Settlement Account  │ DEBIT     │ -10,000.00 │
└─────────────────────┴───────────┴────────────┘
NET: 0 (balanced)
```

### Transfer (User A → User B)

```
Transaction: TRANSFER, amount: 5,000 NGN

Entries:
┌─────────────────────┬───────────┬───────────┐
│ Account             │ Direction │ Amount    │
├─────────────────────┼───────────┼───────────┤
│ User A Ledger       │ DEBIT     │ -5,000.00 │
│ User B Ledger       │ CREDIT    │ +5,000.00 │
└─────────────────────┴───────────┴───────────┘
NET: 0 (balanced)
```

### Transfer with Fee

```
Transaction: TRANSFER, amount: 5,000 NGN, fee: 50 NGN

Entries:
┌─────────────────────┬───────────┬───────────┐
│ Account             │ Direction │ Amount    │
├─────────────────────┼───────────┼───────────┤
│ User A Ledger       │ DEBIT     │ -5,050.00 │
│ User B Ledger       │ CREDIT    │ +5,000.00 │
│ Fee Account         │ CREDIT    │ +50.00    │
└─────────────────────┴───────────┴───────────┘
NET: 0 (balanced)
```

### Payout (User → External)

```
Transaction: PAYOUT, amount: 20,000 NGN

Entries:
┌─────────────────────┬───────────┬────────────┐
│ Account             │ Direction │ Amount     │
├─────────────────────┼───────────┼────────────┤
│ User Ledger Account │ DEBIT     │ -20,000.00 │
│ Settlement Account  │ CREDIT    │ +20,000.00 │
└─────────────────────┴───────────┴────────────┘
NET: 0 (balanced)
```

---

## Migration Strategy

### Initial Setup

```bash
# Generate Prisma client
pnpm prisma generate

# Create initial migration
pnpm prisma migrate dev --name init

# Seed system accounts (required)
pnpm prisma db seed
```

### System Accounts Seed

```typescript
// prisma/seed.ts
async function main() {
  // Create system wallet for settlement
  const systemWallet = await prisma.wallets.create({
    data: {
      user_id: 'SYSTEM',  // Special system user
      currency: 'NGN',
      status: 'ACTIVE',
    }
  });

  // Create settlement ledger account
  await prisma.ledger_accounts.create({
    data: {
      id: process.env.SYSTEM_SETTLEMENT_LEDGER_ID,
      wallet_id: systemWallet.id,
      currency: 'NGN',
    }
  });
}
```

---

## Data Integrity Rules

1. **Immutable Ledger Entries**: Never UPDATE or DELETE
2. **Balanced Transactions**: Every transaction's entries sum to zero
3. **Unique References**: No duplicate transaction references
4. **Foreign Key Cascade**: User deletion cascades to wallets
5. **Wallet Uniqueness**: One wallet per user per currency
6. **Address Uniqueness**: No duplicate payment accounts per network
