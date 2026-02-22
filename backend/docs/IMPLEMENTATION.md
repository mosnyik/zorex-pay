# Zorex Pay - Implementation Plan

## Current Status Overview

| Component | Status | Completion |
|-----------|--------|------------|
| Database Schema | Complete | 100% |
| Authentication | Complete | 100% |
| NGN Funding (Paystack) | Complete | 100% |
| Crypto Funding (NOWPayments) | Not Started | 0% |
| Internal Transfers | Not Started | 0% |
| Payouts/Withdrawals | Not Started | 0% |
| Wallet Endpoints | Partial | 30% |
| Transaction History | Not Started | 0% |
| Rates Service | Not Started | 0% |
| Admin Endpoints | Not Started | 0% |

**Overall Backend Completion: ~35%**

---

## Completed Features

### 1. Database Schema (100%)

All tables defined in Prisma schema:
- `users` - User accounts with KYC status
- `wallets` - Multi-currency wallets
- `ledger_accounts` - Ledger entry points
- `ledger_entries` - Immutable double-entry records
- `transactions` - Financial operations
- `payment_accounts` - Bank/crypto identifiers
- `refresh_tokens` - Session management
- `rates` - Exchange rates

**File:** `backend/prisma/schema.prisma`

### 2. Authentication System (100%)

Full JWT-based authentication with token rotation:

| Feature | File | Status |
|---------|------|--------|
| Registration | `services/auth/register.service.ts` | Done |
| Login | `services/auth/login.service.ts` | Done |
| Token Refresh | `services/auth/refresh.service.ts` | Done |
| Token Revocation | `services/auth/revoke.service.ts` | Done |
| Logout | Route handler | Done |
| Cookie Management | `services/auth/auth.service.ts` | Done |

**Routes:**
- `POST /api/register`
- `POST /api/login`
- `POST /api/refresh`
- `POST /api/revoke`
- `POST /api/logout`

### 3. NGN Funding via Paystack (100%)

Complete fiat on-ramp:

| Feature | File | Status |
|---------|------|--------|
| Initialize Payment | `services/funding/fund.bank.paystack.ts` | Done |
| Webhook Handler | `services/webhooks/service.paystack.ts` | Done |
| Signature Verification | `utils/verifyPaystackSignature.ts` | Done |
| Ledger Entries | `repository/ledger/ledger.repo.ts` | Done |

**Routes:**
- `POST /api/fund-bank`
- `POST /api/webhooks/paystack`

### 4. Wallet Creation (Partial)

NGN wallet auto-created on registration:

| Feature | File | Status |
|---------|------|--------|
| Create Wallet | `repository/wallet.repo.ts` | Done |
| Payment Account Gen | `repository/wallet.repo.ts` | Done (random) |
| Resolve by Account | `repository/wallet.repo.ts` | Done |

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

#### 1.1 Fix Auth Middleware

**Current Issue:** `middleware/request-auth.ts` has bugs:
- Checks for `authorization` type instead of `Bearer`
- Uses wrong secret key reference

**Fix Required:**
```typescript
// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth/auth.service';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      error: 'Authentication required'
    });
  }

  try {
    const payload = authService.verifyAccessToken(token);
    (req as any).user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      data: null,
      error: 'Invalid or expired token'
    });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: 'Insufficient permissions'
      });
    }
    next();
  };
}
```

**Effort:** 1 hour

#### 1.2 Add Missing Domain Errors

**Add to `errors/domain.errors.ts`:**
```typescript
export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class InsufficientBalanceError extends Error {
  constructor(message: string = 'Insufficient balance') {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}
```

**Update error handler to map these:**
```typescript
if (err instanceof NotFoundError) {
  return res.status(404).json({ success: false, data: null, error: err.message });
}
if (err instanceof InsufficientBalanceError) {
  return res.status(400).json({ success: false, data: null, error: err.message });
}
// etc.
```

**Effort:** 30 minutes

#### 1.3 Wallet Service Implementation

**Create `services/wallet/wallet.service.ts`:**
```typescript
import { prisma } from '../../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export const WalletService = {
  async getUserWallets(userId: string) {
    const wallets = await prisma.wallets.findMany({
      where: { user_id: userId },
      include: {
        ledger: {
          include: {
            entries: true
          }
        }
      }
    });

    return wallets.map(wallet => ({
      id: wallet.id,
      currency: wallet.currency,
      status: wallet.status,
      balance: this.calculateBalance(wallet.ledger),
      createdAt: wallet.created_at
    }));
  },

  async getWalletById(walletId: string, userId: string) {
    const wallet = await prisma.wallets.findFirst({
      where: { id: walletId, user_id: userId },
      include: {
        accounts: true,
        ledger: {
          include: { entries: true }
        }
      }
    });

    if (!wallet) return null;

    return {
      id: wallet.id,
      currency: wallet.currency,
      status: wallet.status,
      balance: this.calculateBalance(wallet.ledger),
      paymentAccounts: wallet.accounts,
      createdAt: wallet.created_at
    };
  },

  calculateBalance(ledgerAccounts: any[]): string {
    let balance = new Decimal(0);

    for (const account of ledgerAccounts) {
      for (const entry of account.entries) {
        if (entry.direction === 'CREDIT') {
          balance = balance.plus(entry.amount);
        } else {
          balance = balance.minus(entry.amount);
        }
      }
    }

    return balance.toFixed(2);
  },

  async createWallet(userId: string, currency: string) {
    // Check if wallet exists
    const existing = await prisma.wallets.findFirst({
      where: { user_id: userId, currency: currency as any }
    });

    if (existing) {
      throw new ConflictError('Wallet already exists for this currency');
    }

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallets.create({
        data: {
          user_id: userId,
          currency: currency as any,
          status: 'ACTIVE'
        }
      });

      // Create ledger account
      await tx.ledger_accounts.create({
        data: {
          wallet_id: wallet.id,
          currency: currency as any
        }
      });

      return wallet;
    });
  }
};
```

**Effort:** 2 hours

---

### Phase 2: Crypto Integration (Week 1-2)

#### 2.1 NOWPayments Service Setup

**Install dependency:**
```bash
pnpm add @nowpaymentsio/nowpayments-api-js
```

**Create `services/crypto/nowpayments.service.ts`:**
```typescript
import NowPaymentsApi from '@nowpaymentsio/nowpayments-api-js';

const api = new NowPaymentsApi({
  apiKey: process.env.NOWPAYMENTS_API_KEY!
});

export const NowPaymentsService = {
  async getAvailableCurrencies() {
    return api.getCurrencies();
  },

  async createPayment(input: {
    priceAmount: number;
    priceCurrency: string;
    payCurrency: string;
    orderId: string;
    orderDescription?: string;
  }) {
    return api.createPayment({
      price_amount: input.priceAmount,
      price_currency: input.priceCurrency,
      pay_currency: input.payCurrency,
      order_id: input.orderId,
      order_description: input.orderDescription,
      ipn_callback_url: `${process.env.API_URL}/api/webhooks/nowpayments`
    });
  },

  async getPaymentStatus(paymentId: string) {
    return api.getPaymentStatus(paymentId);
  },

  async createPayout(input: {
    address: string;
    currency: string;
    amount: number;
  }) {
    // NOWPayments Payout API
    return api.createPayout({
      address: input.address,
      currency: input.currency,
      amount: input.amount,
      ipn_callback_url: `${process.env.API_URL}/api/webhooks/nowpayments/payout`
    });
  },

  verifySignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET!)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }
};
```

**Effort:** 3 hours

#### 2.2 Crypto Deposit Address Generation

**Create `services/funding/crypto.funding.service.ts`:**
```typescript
import { prisma } from '../../lib/prisma';
import { NowPaymentsService } from '../crypto/nowpayments.service';
import { v4 as uuidv4 } from 'uuid';

const NETWORK_TO_CURRENCY: Record<string, string> = {
  'TRC20': 'USDTTRC20',
  'BEP20': 'USDTBSC',
  'ERC20': 'USDTERC20',
  'BTC': 'BTC',
  'POLYGON': 'USDTMATIC'
};

export const CryptoFundingService = {
  async getOrCreateDepositAddress(walletId: string, network: string) {
    // Check for existing address
    const existing = await prisma.payment_accounts.findFirst({
      where: {
        wallet_id: walletId,
        network: network as any,
        is_active: true
      }
    });

    if (existing) {
      return {
        address: existing.identifier,
        network,
        existing: true
      };
    }

    // Get wallet info
    const wallet = await prisma.wallets.findUnique({
      where: { id: walletId },
      include: { users: true }
    });

    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    // Create payment with NOWPayments
    const orderId = `deposit_${walletId}_${uuidv4()}`;
    const currency = NETWORK_TO_CURRENCY[network];

    const payment = await NowPaymentsService.createPayment({
      priceAmount: 0,  // Variable amount deposit
      priceCurrency: 'usd',
      payCurrency: currency,
      orderId
    });

    // Store the address
    await prisma.payment_accounts.create({
      data: {
        wallet_id: walletId,
        network: network as any,
        identifier: payment.pay_address,
        provider: 'NOWPAYMENTS',
        is_active: true
      }
    });

    // Create pending transaction
    await prisma.transactions.create({
      data: {
        type: 'FUNDING',
        status: 'PENDING',
        reference: orderId,
        metadata: {
          paymentId: payment.payment_id,
          address: payment.pay_address,
          network,
          walletId
        }
      }
    });

    return {
      address: payment.pay_address,
      network,
      paymentId: payment.payment_id,
      existing: false
    };
  }
};
```

**Effort:** 4 hours

#### 2.3 Crypto Webhook Handler

**Create `services/webhooks/nowpayments.webhook.service.ts`:**
```typescript
import { prisma } from '../../lib/prisma';
import { LedgerRepo } from '../../repository/ledger/ledger.repo';
import { NowPaymentsService } from '../crypto/nowpayments.service';

interface NowPaymentsIPN {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  outcome_amount: number;
  outcome_currency: string;
}

export const NowPaymentsWebhookService = {
  async handleIPN(payload: NowPaymentsIPN, signature: string, rawBody: string) {
    // Verify signature
    if (!NowPaymentsService.verifySignature(rawBody, signature)) {
      throw new Error('Invalid signature');
    }

    // Only process confirmed payments
    if (payload.payment_status !== 'confirmed' &&
        payload.payment_status !== 'finished') {
      return { processed: false, status: payload.payment_status };
    }

    const reference = payload.order_id;

    // Check idempotency
    const existing = await prisma.transactions.findUnique({
      where: { reference }
    });

    if (existing?.status === 'COMPLETED') {
      return { processed: true, duplicate: true };
    }

    // Find wallet by payment account
    const paymentAccount = await prisma.payment_accounts.findFirst({
      where: {
        identifier: payload.pay_address,
        provider: 'NOWPAYMENTS'
      },
      include: { wallets: true }
    });

    if (!paymentAccount) {
      throw new Error('Payment account not found');
    }

    const amount = payload.outcome_amount;

    // Update transaction and create ledger entries
    await prisma.$transaction(async (tx) => {
      const transaction = await tx.transactions.upsert({
        where: { reference },
        update: {
          status: 'COMPLETED',
          metadata: payload
        },
        create: {
          type: 'FUNDING',
          status: 'COMPLETED',
          reference,
          metadata: payload
        }
      });

      await LedgerRepo.createLedgerFundingEntries(tx, {
        transactionId: transaction.id,
        walletId: paymentAccount.wallet_id,
        amount
      });
    });

    return { processed: true };
  }
};
```

**Effort:** 3 hours

---

### Phase 3: Internal Transfers (Week 2)

#### 3.1 Transfer Service

**Create `services/transfer/transfer.service.ts`:**
```typescript
import { prisma } from '../../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from '@prisma/client/runtime/library';
import { InsufficientBalanceError, ValidationError, NotFoundError } from '../../errors/domain.errors';

interface TransferInput {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  note?: string;
}

export const TransferService = {
  async transfer(input: TransferInput, userId: string) {
    const { fromWalletId, toWalletId, amount, note } = input;

    if (amount <= 0) {
      throw new ValidationError('Amount must be positive');
    }

    if (fromWalletId === toWalletId) {
      throw new ValidationError('Cannot transfer to same wallet');
    }

    return prisma.$transaction(async (tx) => {
      // Get sender wallet with ownership check
      const fromWallet = await tx.wallets.findFirst({
        where: { id: fromWalletId, user_id: userId },
        include: {
          ledger: { include: { entries: true } }
        }
      });

      if (!fromWallet) {
        throw new NotFoundError('Source wallet not found');
      }

      if (fromWallet.status !== 'ACTIVE') {
        throw new ValidationError('Source wallet is frozen');
      }

      // Get recipient wallet
      const toWallet = await tx.wallets.findUnique({
        where: { id: toWalletId },
        include: {
          ledger: { include: { entries: true } }
        }
      });

      if (!toWallet) {
        throw new NotFoundError('Destination wallet not found');
      }

      if (toWallet.status !== 'ACTIVE') {
        throw new ValidationError('Destination wallet is frozen');
      }

      // Check currency match
      if (fromWallet.currency !== toWallet.currency) {
        throw new ValidationError('Currency mismatch. Use exchange for conversion.');
      }

      // Calculate sender balance
      let senderBalance = new Decimal(0);
      for (const account of fromWallet.ledger) {
        for (const entry of account.entries) {
          if (entry.direction === 'CREDIT') {
            senderBalance = senderBalance.plus(entry.amount);
          } else {
            senderBalance = senderBalance.minus(entry.amount);
          }
        }
      }

      if (senderBalance.lessThan(amount)) {
        throw new InsufficientBalanceError(
          `Insufficient balance. Available: ${senderBalance.toFixed(2)}`
        );
      }

      // Get ledger accounts
      const fromLedger = fromWallet.ledger[0];
      const toLedger = toWallet.ledger[0];

      if (!fromLedger || !toLedger) {
        throw new Error('Ledger account not found');
      }

      // Create transaction
      const reference = `transfer_${uuidv4()}`;
      const transaction = await tx.transactions.create({
        data: {
          type: 'TRANSFER',
          status: 'COMPLETED',
          reference,
          metadata: {
            fromWalletId,
            toWalletId,
            note
          }
        }
      });

      // Create double-entry
      await tx.ledger_entries.createMany({
        data: [
          {
            transaction_id: transaction.id,
            ledger_account_id: fromLedger.id,
            direction: 'DEBIT',
            amount
          },
          {
            transaction_id: transaction.id,
            ledger_account_id: toLedger.id,
            direction: 'CREDIT',
            amount
          }
        ]
      });

      return {
        transactionId: transaction.id,
        reference,
        status: 'COMPLETED',
        amount: amount.toFixed(2),
        currency: fromWallet.currency
      };
    });
  },

  async transferByUsername(
    fromWalletId: string,
    recipientUsername: string,
    currency: string,
    amount: number,
    userId: string,
    note?: string
  ) {
    // Find recipient
    const recipient = await prisma.users.findUnique({
      where: { user_name: recipientUsername },
      include: {
        wallets: {
          where: { currency: currency as any }
        }
      }
    });

    if (!recipient) {
      throw new NotFoundError('Recipient not found');
    }

    if (recipient.wallets.length === 0) {
      throw new NotFoundError(`Recipient has no ${currency} wallet`);
    }

    return this.transfer({
      fromWalletId,
      toWalletId: recipient.wallets[0].id,
      amount,
      note
    }, userId);
  }
};
```

**Effort:** 4 hours

---

### Phase 4: Payouts/Withdrawals (Week 2)

#### 4.1 Bank Payout Service

**Create `services/payout/bank.payout.service.ts`:**
```typescript
import { prisma } from '../../lib/prisma';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface BankPayoutInput {
  walletId: string;
  amount: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

export const BankPayoutService = {
  async initiatePayout(input: BankPayoutInput, userId: string) {
    const { walletId, amount, bankCode, accountNumber, accountName } = input;

    // Verify ownership and balance
    const wallet = await prisma.wallets.findFirst({
      where: { id: walletId, user_id: userId, currency: 'NGN' },
      include: {
        ledger: { include: { entries: true } }
      }
    });

    if (!wallet) {
      throw new NotFoundError('NGN wallet not found');
    }

    // Calculate balance
    let balance = new Decimal(0);
    for (const account of wallet.ledger) {
      for (const entry of account.entries) {
        if (entry.direction === 'CREDIT') {
          balance = balance.plus(entry.amount);
        } else {
          balance = balance.minus(entry.amount);
        }
      }
    }

    const fee = 50; // Flat fee in NGN
    const totalDebit = amount + fee;

    if (balance.lessThan(totalDebit)) {
      throw new InsufficientBalanceError('Insufficient balance including fees');
    }

    const reference = `payout_${uuidv4()}`;

    return prisma.$transaction(async (tx) => {
      // Create PENDING transaction
      const transaction = await tx.transactions.create({
        data: {
          type: 'PAYOUT',
          status: 'PENDING',
          reference,
          metadata: {
            walletId,
            bankCode,
            accountNumber,
            accountName,
            amount,
            fee
          }
        }
      });

      // Create transfer recipient with Paystack
      const recipientResponse = await axios.post(
        'https://api.paystack.co/transferrecipient',
        {
          type: 'nuban',
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN'
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

      const recipientCode = recipientResponse.data.data.recipient_code;

      // Initiate transfer
      const transferResponse = await axios.post(
        'https://api.paystack.co/transfer',
        {
          source: 'balance',
          amount: amount * 100, // Kobo
          recipient: recipientCode,
          reason: `Zorex Pay withdrawal - ${reference}`,
          reference
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

      // Create ledger entries (debit user, credit settlement)
      const ledgerAccount = wallet.ledger[0];
      await tx.ledger_entries.createMany({
        data: [
          {
            transaction_id: transaction.id,
            ledger_account_id: ledgerAccount.id,
            direction: 'DEBIT',
            amount: totalDebit
          },
          {
            transaction_id: transaction.id,
            ledger_account_id: process.env.SYSTEM_SETTLEMENT_LEDGER_ID!,
            direction: 'CREDIT',
            amount: totalDebit
          }
        ]
      });

      return {
        transactionId: transaction.id,
        reference,
        status: 'PENDING',
        amount,
        fee,
        transferCode: transferResponse.data.data.transfer_code
      };
    });
  }
};
```

**Effort:** 4 hours

#### 4.2 Crypto Payout Service

**Create `services/payout/crypto.payout.service.ts`:**
```typescript
import { prisma } from '../../lib/prisma';
import { NowPaymentsService } from '../crypto/nowpayments.service';
import { v4 as uuidv4 } from 'uuid';

interface CryptoPayoutInput {
  walletId: string;
  amount: number;
  address: string;
  network: string;
}

export const CryptoPayoutService = {
  async initiatePayout(input: CryptoPayoutInput, userId: string) {
    const { walletId, amount, address, network } = input;

    // Verify wallet ownership
    const wallet = await prisma.wallets.findFirst({
      where: { id: walletId, user_id: userId },
      include: {
        ledger: { include: { entries: true } }
      }
    });

    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    // Calculate balance
    let balance = new Decimal(0);
    for (const account of wallet.ledger) {
      for (const entry of account.entries) {
        if (entry.direction === 'CREDIT') {
          balance = balance.plus(entry.amount);
        } else {
          balance = balance.minus(entry.amount);
        }
      }
    }

    // Network fee estimate (would come from NOWPayments API)
    const fee = 1; // Simplified
    const totalDebit = amount + fee;

    if (balance.lessThan(totalDebit)) {
      throw new InsufficientBalanceError('Insufficient balance including fees');
    }

    const reference = `crypto_payout_${uuidv4()}`;

    return prisma.$transaction(async (tx) => {
      // Create PENDING transaction
      const transaction = await tx.transactions.create({
        data: {
          type: 'PAYOUT',
          status: 'PENDING',
          reference,
          metadata: {
            walletId,
            address,
            network,
            amount,
            fee
          }
        }
      });

      // Initiate payout via NOWPayments
      const payout = await NowPaymentsService.createPayout({
        address,
        currency: wallet.currency,
        amount
      });

      // Create ledger entries
      const ledgerAccount = wallet.ledger[0];
      await tx.ledger_entries.createMany({
        data: [
          {
            transaction_id: transaction.id,
            ledger_account_id: ledgerAccount.id,
            direction: 'DEBIT',
            amount: totalDebit
          },
          {
            transaction_id: transaction.id,
            ledger_account_id: process.env.SYSTEM_SETTLEMENT_LEDGER_ID!,
            direction: 'CREDIT',
            amount: totalDebit
          }
        ]
      });

      return {
        transactionId: transaction.id,
        reference,
        status: 'PENDING',
        amount,
        fee,
        payoutId: payout.id
      };
    });
  }
};
```

**Effort:** 3 hours

---

### Phase 5: Routes & Controllers (Week 2)

#### 5.1 New Routes to Create

| Route | Method | Controller | Service |
|-------|--------|------------|---------|
| `/api/wallets` | GET | wallets.controller | WalletService |
| `/api/wallets` | POST | wallets.controller | WalletService |
| `/api/wallets/:id` | GET | wallets.controller | WalletService |
| `/api/wallets/:id/transactions` | GET | wallets.controller | TransactionService |
| `/api/transfers` | POST | transfers.controller | TransferService |
| `/api/transfers/username` | POST | transfers.controller | TransferService |
| `/api/funding/crypto/address` | GET | funding.controller | CryptoFundingService |
| `/api/payouts/bank` | POST | payouts.controller | BankPayoutService |
| `/api/payouts/crypto` | POST | payouts.controller | CryptoPayoutService |
| `/api/webhooks/nowpayments` | POST | webhooks.controller | NowPaymentsWebhook |
| `/api/rates` | GET | rates.controller | RatesService |
| `/api/profile` | GET/PATCH | profile.controller | UserService |

**Effort:** 6 hours

#### 5.2 Update index.ts

```typescript
// Add new routes
import wallets from "./routes/wallets/route.wallets";
import transfers from "./routes/transfers/route.transfers";
import cryptoFunding from "./routes/funding/route.crypto";
import bankPayout from "./routes/payouts/route.bank";
import cryptoPayout from "./routes/payouts/route.crypto";
import nowpayments from "./routes/webhooks/route.nowpayments";
import rates from "./routes/rates/route.rates";
import profile from "./routes/profile/route.profile";
import { requireAuth } from "./middleware/auth.middleware";

// Protected routes
app.use("/api/wallets", requireAuth, wallets);
app.use("/api/transfers", requireAuth, transfers);
app.use("/api/funding/crypto", requireAuth, cryptoFunding);
app.use("/api/payouts/bank", requireAuth, bankPayout);
app.use("/api/payouts/crypto", requireAuth, cryptoPayout);
app.use("/api/profile", requireAuth, profile);

// Public routes
app.use("/api/rates", rates);

// Webhooks (special handling for raw body)
app.use("/api/webhooks/nowpayments", express.raw({ type: 'application/json' }), nowpayments);
```

---

### Phase 6: Rates & Utilities (Week 2)

#### 6.1 Rates Service

```typescript
// services/rates/rates.service.ts
import { prisma } from '../../lib/prisma';

export const RatesService = {
  async getAllRates() {
    return prisma.rates.findMany();
  },

  async getRate(from: string, to: string) {
    return prisma.rates.findFirst({
      where: {
        currency_from: from,
        currency_to: to
      }
    });
  },

  async updateRates(rates: Array<{from: string, to: string, rate: number}>) {
    for (const rate of rates) {
      await prisma.rates.upsert({
        where: {
          currency_from_currency_to: {
            currency_from: rate.from,
            currency_to: rate.to
          }
        },
        update: { current_rate: rate.rate },
        create: {
          currency_from: rate.from,
          currency_to: rate.to,
          current_rate: rate.rate,
          merchant_rate: rate.rate
        }
      });
    }
  }
};
```

**Effort:** 2 hours

---

## Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/zorex_pay

# JWT
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx

# NOWPayments
NOWPAYMENTS_API_KEY=your-api-key
NOWPAYMENTS_IPN_SECRET=your-ipn-secret

# System
SYSTEM_SETTLEMENT_LEDGER_ID=uuid-of-settlement-account
API_URL=http://localhost:5500
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=5500
```

---

## Testing Strategy

### Unit Tests
- Service layer functions
- Balance calculations
- Validation logic

### Integration Tests
- Full API flows
- Database transactions
- Webhook handling

### E2E Tests
- Complete user journeys
- Payment flows (with mocked providers)

---

## Estimated Timeline

| Phase | Tasks | Effort | Priority |
|-------|-------|--------|----------|
| 1 | Core Infrastructure | 4 hours | Critical |
| 2 | Crypto Integration | 10 hours | High |
| 3 | Internal Transfers | 4 hours | High |
| 4 | Payouts | 7 hours | High |
| 5 | Routes & Controllers | 6 hours | High |
| 6 | Rates & Utilities | 2 hours | Medium |
| - | Testing | 8 hours | High |
| - | Documentation | 4 hours | Medium |

**Total Estimated Effort: ~45 hours**

---

## Dependencies to Install

```bash
pnpm add @nowpaymentsio/nowpayments-api-js
```

All other dependencies are already installed.
