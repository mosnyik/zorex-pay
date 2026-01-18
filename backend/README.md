# Zorex Pay

### A Production-Grade Payment Backend (Portfolio Project)

Zorex Pay is a backend system designed to model **real-world payment infrastructure** using a **ledger-first architecture**.

This project demonstrates how to safely handle:
- multi-currency wallets
- fiat and blockchain funding paths
- internal and external transfers
- auditable financial state transitions

It is intended as a **portfolio project** for mid–senior backend roles and does not process real funds.

---

## Design Principles

The system is built around a few non-negotiable rules:

- Wallet balances are **derived**, never stored
- All financial changes are **ledger-backed**
- Transactions are **atomic and immutable**
- Every operation is **auditable**
- Failure is expected and explicitly handled

---

## Supported Assets & Networks

### Currencies
Defined in `currency_type`:

- NGN
- USDT
- BTC
- ETH
- BNB
- TRX

### Networks
Defined in `network_type`:

- BANK
- TRC20
- BEP20
- **POLYGON**
- ERC20
- BTC

A currency and its network are treated as **separate concerns**.  
For example, `USDT` on `ERC20` and `USDT` on `TRC20` are distinct funding paths.

---

## User & Identity Model

### Users

Users are uniquely identified and authenticated using JWT-based authentication.

- Short-lived access tokens (5 minutes)
- Refresh tokens with revocation support
- Optional KYC state:
  - UNVERIFIED
  - PENDING
  - VERIFIED

A user may own multiple wallets, but only **one wallet per currency**.

---

## Wallet Model

Wallets represent user-owned containers for funds.

### Key Rules

- One wallet per user per currency
- Wallets have a lifecycle:
  - ACTIVE
  - FROZEN
- Wallets do **not** store balances

Wallets act as **containers**, not accounting sources of truth.

---

## Payment Accounts (Funding & Withdrawal Endpoints)

Each wallet may have multiple associated payment accounts, such as:

- Bank account numbers
- Crypto addresses
- Provider-managed identifiers

This design allows:
- multiple funding rails per wallet
- abstraction over payment providers (e.g. Paystack, Flutterwave, blockchain RPCs)

---

## Ledger Architecture

### Ledger Accounts

Ledger accounts back wallets and represent where balances are actually tracked.

Ledger accounts are categorized into logical types:
- USER
- SYSTEM
- FEE
- SETTLEMENT

This separation enables proper clearing, fee collection, and reconciliation.

---

### Ledger Entries

Ledger entries represent **actual balance movement**.

- CREDIT increases balance
- DEBIT decreases balance
- Entries are immutable
- Entries never exist without a transaction

There is no direct balance mutation anywhere in the system.

---

## Transactions

Transactions are the **atomic unit of financial change**.

### Transaction Types

- FUNDING  
  External → Wallet
- PAYOUT  
  Wallet → External
- TRANSFER  
  Wallet → Wallet
- PAYMENT  
  Wallet → Service / Merchant

### Transaction Statuses

- PENDING
- COMPLETED
- FAILED
- REVERSED

Every transaction:
- has a globally unique reference
- produces one or more ledger entries
- is safe to retry (idempotent)

---

## Funds Flow Examples

### Internal Transfer

1. Create transaction
2. Debit sender ledger account
3. Credit recipient ledger account
4. Mark transaction as completed

---

### External Deposit

1. Wait for bank callback or blockchain confirmation
2. Create funding transaction
3. Credit user ledger account

---

### Withdrawal

1. Lock funds via a pending transaction
2. Execute external payout
3. Finalize ledger on success

---

## Failure Handling & Idempotency

- All financial write operations are idempotent
- Duplicate requests reuse the same transaction reference
- Partial failures do not corrupt balances
- Reversals are modeled explicitly via `REVERSED` status

---

## Security Considerations

- Short-lived access tokens
- Refresh token rotation and revocation
- Wallet freezing prevents fund movement
- No trust in client-provided balances or totals
- Ledger-only accounting model

---

## Technology Stack

- Node.js + TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Blockchain SDKs (Ethers, Web3, TronWeb)

---

## Why This Design

This project intentionally avoids:
- storing wallet balances
- hidden side effects
- demo-style shortcuts

The schema and logic aim to reflect how **real payment systems** are designed under failure, retries, and audits.

---

## License

MIT
