# Zorex Pay - Business Flows

## User Journeys

### 1. User Registration

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Start   │────▶│  Fill    │────▶│ Validate │────▶│  Create  │
│          │     │  Form    │     │  Input   │     │  Account │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                        │
                      ┌─────────────────────────────────┘
                      ▼
               ┌──────────┐     ┌──────────┐     ┌──────────┐
               │  Create  │────▶│  Create  │────▶│  Return  │
               │NGN Wallet│     │  Ledger  │     │  Success │
               └──────────┘     │ Account  │     └──────────┘
                                └──────────┘
```

**API Flow:**
```
POST /api/register
├── Validate input (Zod)
├── Check duplicates (email, username, phone)
├── Hash password (bcrypt)
├── $transaction {
│   ├── Create user
│   ├── Create NGN wallet
│   ├── Create ledger account
│   └── Create payment account (bank number)
│   }
└── Return user data
```

---

### 2. User Login

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Enter   │────▶│  Verify  │────▶│ Generate │────▶│   Set    │
│  Creds   │     │ Password │     │  Tokens  │     │ Cookies  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

**Token Flow:**
```
                    ┌─────────────────┐
                    │   User Login    │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
    ┌─────────────────┐            ┌─────────────────┐
    │  Access Token   │            │ Refresh Token   │
    │  (5 min expiry) │            │ (24 hr expiry)  │
    └────────┬────────┘            └────────┬────────┘
             │                              │
             │                              ▼
             │                     ┌─────────────────┐
             │                     │   Store in DB   │
             │                     │  (revocable)    │
             │                     └─────────────────┘
             │                              │
             └──────────────┬───────────────┘
                            ▼
                   ┌─────────────────┐
                   │  httpOnly       │
                   │  Cookies        │
                   └─────────────────┘
```

---

### 3. Token Refresh

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Access  │────▶│  Send    │────▶│ Validate │────▶│  Issue   │
│ Expired  │     │ Refresh  │     │ in DB    │     │  New     │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                        │
                      ┌─────────────────────────────────┘
                      ▼
               ┌──────────┐     ┌──────────┐
               │  Revoke  │────▶│   Set    │
               │   Old    │     │ New Cook │
               └──────────┘     └──────────┘
```

---

### 4. NGN Funding (Paystack)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NGN FUNDING FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

  User                    Zorex API                Paystack
   │                          │                        │
   │  POST /fund-bank         │                        │
   │  {walletId, amount}      │                        │
   │─────────────────────────▶│                        │
   │                          │                        │
   │                          │  Create PENDING        │
   │                          │  transaction           │
   │                          │                        │
   │                          │  POST /initialize      │
   │                          │─────────────────────────▶
   │                          │                        │
   │                          │  {authorization_url}   │
   │                          │◀─────────────────────────
   │                          │                        │
   │  {authorizationUrl}      │                        │
   │◀─────────────────────────│                        │
   │                          │                        │
   │  Redirect to Paystack    │                        │
   │─────────────────────────────────────────────────▶│
   │                          │                        │
   │  Complete payment        │                        │
   │                          │                        │
   │                          │  POST /webhooks/paystack
   │                          │◀─────────────────────────
   │                          │  {charge.success}      │
   │                          │                        │
   │                          │  Verify signature      │
   │                          │  Update transaction    │
   │                          │  Create ledger entries │
   │                          │                        │
   │                          │  {received: true}      │
   │                          │─────────────────────────▶
   │                          │                        │
   │  Balance updated!        │                        │
   │                          │                        │

LEDGER ENTRIES:
┌────────────────────┬───────────┬────────────┐
│ Account            │ Direction │ Amount     │
├────────────────────┼───────────┼────────────┤
│ User NGN Ledger    │ CREDIT    │ +10,000.00 │
│ Settlement Account │ DEBIT     │ -10,000.00 │
└────────────────────┴───────────┴────────────┘
```

---

### 5. Crypto Funding (NOWPayments)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CRYPTO FUNDING FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

  User                    Zorex API               NOWPayments
   │                          │                        │
   │  GET /funding/crypto/    │                        │
   │  address?walletId&network│                        │
   │─────────────────────────▶│                        │
   │                          │                        │
   │                          │  Check existing addr   │
   │                          │                        │
   │                          │  POST /payment         │
   │                          │─────────────────────────▶
   │                          │                        │
   │                          │  {pay_address}         │
   │                          │◀─────────────────────────
   │                          │                        │
   │                          │  Store payment_account │
   │                          │  Create PENDING tx     │
   │                          │                        │
   │  {address, network}      │                        │
   │◀─────────────────────────│                        │
   │                          │                        │
   │                          │                        │
   │  Send crypto to address  │                        │
   │──────────────────────────────────────────────────▶│
   │                          │                        │
   │                          │  [Blockchain confirms] │
   │                          │                        │
   │                          │  POST /webhooks/nowpay │
   │                          │◀─────────────────────────
   │                          │  {payment confirmed}   │
   │                          │                        │
   │                          │  Verify signature      │
   │                          │  Update transaction    │
   │                          │  Create ledger entries │
   │                          │                        │
   │  Balance updated!        │                        │
   │                          │                        │

LEDGER ENTRIES:
┌─────────────────────┬───────────┬────────────┐
│ Account             │ Direction │ Amount     │
├─────────────────────┼───────────┼────────────┤
│ User USDT Ledger    │ CREDIT    │ +100.00    │
│ Settlement Account  │ DEBIT     │ -100.00    │
└─────────────────────┴───────────┴────────────┘
```

---

### 6. Internal Transfer

```
┌─────────────────────────────────────────────────────────────────────┐
│                       INTERNAL TRANSFER FLOW                         │
└─────────────────────────────────────────────────────────────────────┘

  Sender                  Zorex API                 Recipient
   │                          │                        │
   │  POST /transfers         │                        │
   │  {from, to, amount}      │                        │
   │─────────────────────────▶│                        │
   │                          │                        │
   │                          │  $transaction {        │
   │                          │    Verify ownership    │
   │                          │    Check balance       │
   │                          │    Check currencies    │
   │                          │    Create TRANSFER tx  │
   │                          │    DEBIT sender        │
   │                          │    CREDIT recipient    │
   │                          │  }                     │
   │                          │                        │
   │  {transactionId, status} │                        │
   │◀─────────────────────────│                        │
   │                          │                        │
   │  Balance decreased       │    Balance increased   │
   │                          │                        │

LEDGER ENTRIES:
┌─────────────────────┬───────────┬────────────┐
│ Account             │ Direction │ Amount     │
├─────────────────────┼───────────┼────────────┤
│ Sender Ledger       │ DEBIT     │ -5,000.00  │
│ Recipient Ledger    │ CREDIT    │ +5,000.00  │
└─────────────────────┴───────────┴────────────┘
```

---

### 7. Bank Payout (NGN Withdrawal)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BANK PAYOUT FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

  User                    Zorex API                Paystack
   │                          │                        │
   │  POST /payouts/bank      │                        │
   │  {walletId, amount,      │                        │
   │   bankCode, accountNo}   │                        │
   │─────────────────────────▶│                        │
   │                          │                        │
   │                          │  Verify balance        │
   │                          │  Calculate fee         │
   │                          │                        │
   │                          │  $transaction {        │
   │                          │    Create PENDING tx   │
   │                          │    DEBIT user          │
   │                          │    CREDIT settlement   │
   │                          │  }                     │
   │                          │                        │
   │                          │  POST /transferrecip   │
   │                          │─────────────────────────▶
   │                          │  {recipient_code}      │
   │                          │◀─────────────────────────
   │                          │                        │
   │                          │  POST /transfer        │
   │                          │─────────────────────────▶
   │                          │  {transfer_code}       │
   │                          │◀─────────────────────────
   │                          │                        │
   │  {status: PENDING}       │                        │
   │◀─────────────────────────│                        │
   │                          │                        │
   │                          │  POST /webhooks/paystk │
   │                          │◀─────────────────────────
   │                          │  {transfer.success}    │
   │                          │                        │
   │                          │  Update tx COMPLETED   │
   │                          │                        │
   │  Bank account credited!  │                        │
   │                          │                        │

LEDGER ENTRIES (on initiation):
┌─────────────────────┬───────────┬────────────┐
│ Account             │ Direction │ Amount     │
├─────────────────────┼───────────┼────────────┤
│ User NGN Ledger     │ DEBIT     │ -50,050.00 │
│ Settlement Account  │ CREDIT    │ +50,050.00 │
└─────────────────────┴───────────┴────────────┘
(Amount: 50,000 + Fee: 50)
```

---

### 8. Crypto Payout (Withdrawal)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CRYPTO PAYOUT FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

  User                    Zorex API               NOWPayments
   │                          │                        │
   │  POST /payouts/crypto    │                        │
   │  {walletId, amount,      │                        │
   │   address, network}      │                        │
   │─────────────────────────▶│                        │
   │                          │                        │
   │                          │  Validate address      │
   │                          │  Verify balance        │
   │                          │  Calculate fee         │
   │                          │                        │
   │                          │  $transaction {        │
   │                          │    Create PENDING tx   │
   │                          │    DEBIT user          │
   │                          │    CREDIT settlement   │
   │                          │  }                     │
   │                          │                        │
   │                          │  POST /payout          │
   │                          │─────────────────────────▶
   │                          │  {payout_id}           │
   │                          │◀─────────────────────────
   │                          │                        │
   │  {status: PENDING}       │                        │
   │◀─────────────────────────│                        │
   │                          │                        │
   │                          │  [Blockchain tx sent]  │
   │                          │                        │
   │                          │  POST /webhooks/nowpay │
   │                          │◀─────────────────────────
   │                          │  {payout confirmed}    │
   │                          │                        │
   │                          │  Update tx COMPLETED   │
   │                          │                        │
   │  Crypto wallet credited! │                        │
   │                          │                        │
```

---

## Transaction State Machine

```
                    ┌─────────────┐
                    │   CREATE    │
                    │ Transaction │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
         ┌─────────│   PENDING   │─────────┐
         │         └──────┬──────┘         │
         │                │                │
         │  [Timeout/     │  [Confirmed]   │  [Error]
         │   Rejected]    │                │
         │                │                │
         ▼                ▼                ▼
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │   FAILED    │  │  COMPLETED  │  │   FAILED    │
  │  (Terminal) │  └──────┬──────┘  │  (Terminal) │
  └─────────────┘         │         └─────────────┘
                          │
                          │  [Admin/Dispute]
                          │
                          ▼
                   ┌─────────────┐
                   │  REVERSED   │
                   │  (Terminal) │
                   └─────────────┘
```

**State Transitions:**

| From | To | Trigger |
|------|-----|---------|
| - | PENDING | Transaction created |
| PENDING | COMPLETED | Webhook confirmation |
| PENDING | FAILED | Timeout, rejection, error |
| COMPLETED | REVERSED | Admin action, dispute |

---

## Double-Entry Bookkeeping Flows

### Pattern 1: External Funding

```
External World ──────▶ User Wallet

CREDIT: User's Ledger Account     (+amount)
DEBIT:  Settlement Account        (-amount)
────────────────────────────────────────────
NET:    0 (balanced)
```

### Pattern 2: External Payout

```
User Wallet ──────▶ External World

DEBIT:  User's Ledger Account     (-amount)
CREDIT: Settlement Account        (+amount)
────────────────────────────────────────────
NET:    0 (balanced)
```

### Pattern 3: Internal Transfer

```
User A Wallet ──────▶ User B Wallet

DEBIT:  User A's Ledger Account   (-amount)
CREDIT: User B's Ledger Account   (+amount)
────────────────────────────────────────────
NET:    0 (balanced)
```

### Pattern 4: Transfer with Fee

```
User A Wallet ──────▶ User B Wallet + Platform

DEBIT:  User A's Ledger Account   (-amount - fee)
CREDIT: User B's Ledger Account   (+amount)
CREDIT: Fee Account               (+fee)
────────────────────────────────────────────
NET:    0 (balanced)
```

### Pattern 5: Reversal

```
Original Transaction Entries (negated)

Original:
  CREDIT: User Account    +1000
  DEBIT:  Settlement      -1000

Reversal:
  DEBIT:  User Account    -1000
  CREDIT: Settlement      +1000
────────────────────────────────────────────
NET:    0 (all balanced)
User Balance: Original restored
```

---

## Balance Calculation

```
┌─────────────────────────────────────────────────────────────────────┐
│                     BALANCE CALCULATION                              │
└─────────────────────────────────────────────────────────────────────┘

Given: User has wallet_id = "abc123"

Step 1: Find ledger account
┌─────────────────────────────────────────┐
│ ledger_accounts                         │
│ WHERE wallet_id = "abc123"              │
│ → ledger_account_id = "ledger_xyz"      │
└─────────────────────────────────────────┘

Step 2: Sum all entries
┌─────────────────────────────────────────────────────────────────────┐
│ ledger_entries WHERE ledger_account_id = "ledger_xyz"               │
├──────────┬───────────┬────────────┬─────────────────────────────────┤
│ Entry ID │ Direction │ Amount     │ Running Balance                  │
├──────────┼───────────┼────────────┼─────────────────────────────────┤
│ e001     │ CREDIT    │ +10,000.00 │ 10,000.00                        │
│ e002     │ DEBIT     │ -2,000.00  │ 8,000.00                         │
│ e003     │ CREDIT    │ +5,000.00  │ 13,000.00                        │
│ e004     │ DEBIT     │ -500.00    │ 12,500.00                        │
└──────────┴───────────┴────────────┴─────────────────────────────────┘

Balance = SUM(CREDIT) - SUM(DEBIT)
        = 15,000.00 - 2,500.00
        = 12,500.00
```

---

## Error Flows

### Insufficient Balance

```
User                    Zorex API
 │                          │
 │  POST /transfers         │
 │  {amount: 100000}        │
 │─────────────────────────▶│
 │                          │
 │                          │  Calculate balance: 5000
 │                          │  Check: 5000 < 100000
 │                          │
 │  400 Bad Request         │
 │  {error: "Insufficient   │
 │   balance. Available:    │
 │   5000.00"}              │
 │◀─────────────────────────│
 │                          │
 │  No ledger entries       │
 │  created (rolled back)   │
 │                          │
```

### Webhook Signature Failure

```
Attacker                Zorex API
 │                          │
 │  POST /webhooks/paystack │
 │  {fake payload}          │
 │  x-signature: invalid    │
 │─────────────────────────▶│
 │                          │
 │                          │  Verify signature: FAILED
 │                          │  Log warning with IP
 │                          │
 │  401 Unauthorized        │
 │  {error: "Invalid sig"}  │
 │◀─────────────────────────│
 │                          │
 │  No processing occurs    │
 │                          │
```

### Duplicate Webhook (Idempotent)

```
Paystack                Zorex API
 │                          │
 │  POST /webhooks/paystack │
 │  {ref: "zorex_abc123"}   │
 │─────────────────────────▶│
 │                          │
 │                          │  Find tx by ref
 │                          │  Status: COMPLETED
 │                          │  Skip processing
 │                          │
 │  200 OK                  │
 │  {received: true}        │
 │◀─────────────────────────│
 │                          │
 │  No duplicate entries    │
 │                          │
```
