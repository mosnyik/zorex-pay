# Zorex Pay - API Specification

## Base URL

```
Development: http://localhost:5500/api
Production:  https://api.zorexpay.com/api
```

## Authentication

All authenticated endpoints require JWT tokens sent via httpOnly cookies.

**Cookie Names:**
- `accessToken` - Short-lived access token (5 minutes)
- `refreshToken` - Long-lived refresh token (24 hours)

**Unauthenticated Response:**
```json
{
  "success": false,
  "data": null,
  "error": "Authentication required"
}
```

**Token Expired Response:**
```json
{
  "success": false,
  "data": null,
  "error": "Token expired",
  "code": "TOKEN_EXPIRED"
}
```

---

## Response Format

All responses follow this structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}
```

**Success Example:**
```json
{
  "success": true,
  "data": { "id": "uuid", "email": "user@example.com" },
  "error": null
}
```

**Error Example:**
```json
{
  "success": false,
  "data": null,
  "error": "Validation error: email is required"
}
```

---

## Endpoints

### Authentication

#### POST /register

Create a new user account. Automatically creates an NGN wallet.

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "user_name": "johndoe",
  "email": "john@example.com",
  "phone": "08012345678",
  "password": "SecurePass123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "first_name": "John",
    "last_name": "Doe",
    "user_name": "johndoe",
    "email": "john@example.com",
    "phone": "08012345678",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

**Errors:**
- `400` - Validation error
- `409` - User already exists (email/username/phone)

---

#### POST /login

Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "first_name": "John",
    "last_name": "Doe",
    "user_name": "johndoe",
    "email": "john@example.com",
    "phone": "08012345678",
    "role": "USER",
    "kyc_status": "UNVERFIED",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

**Cookies Set:**
- `accessToken` (httpOnly, 5 min expiry)
- `refreshToken` (httpOnly, 24 hour expiry)

**Errors:**
- `400` - Invalid credentials

---

#### POST /refresh

Refresh access token using refresh token.

**Request:** No body required (refresh token from cookie)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Tokens refreshed"
  },
  "error": null
}
```

**Cookies Set:**
- New `accessToken`
- New `refreshToken` (old one invalidated)

---

#### POST /revoke

Revoke refresh token (logout from specific device).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Token revoked"
  },
  "error": null
}
```

---

#### POST /logout

Clear all session cookies.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out"
  },
  "error": null
}
```

---

### Wallets

#### GET /wallets

Get all wallets for authenticated user with balances.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "id": "wallet-uuid-1",
        "currency": "NGN",
        "status": "ACTIVE",
        "balance": "150000.00",
        "createdAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": "wallet-uuid-2",
        "currency": "USDT",
        "status": "ACTIVE",
        "balance": "500.00",
        "createdAt": "2024-01-16T14:00:00Z"
      }
    ]
  },
  "error": null
}
```

---

#### POST /wallets

Create a new wallet for a different currency.

**Auth Required:** Yes

**Request:**
```json
{
  "currency": "USDT"
}
```

**Valid Currencies:** `NGN`, `USDT`, `BTC`, `ETH`, `BNB`, `TRX`

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "wallet-uuid",
    "currency": "USDT",
    "status": "ACTIVE",
    "balance": "0.00",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

**Errors:**
- `400` - Invalid currency
- `409` - Wallet already exists for this currency

---

#### GET /wallets/:walletId

Get specific wallet details.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "wallet-uuid",
    "currency": "USDT",
    "status": "ACTIVE",
    "balance": "500.00",
    "paymentAccounts": [
      {
        "id": "account-uuid",
        "network": "TRC20",
        "identifier": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
        "provider": "NOWPAYMENTS",
        "isActive": true
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

---

#### GET /wallets/:walletId/balance

Get wallet balance.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "walletId": "wallet-uuid",
    "balance": "500.00",
    "currency": "USDT"
  },
  "error": null
}
```

---

#### GET /wallets/networks/:currency

Get valid networks for a currency.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "currency": "USDT",
    "networks": ["TRC20", "BEP20", "ERC20", "POLYGON"]
  },
  "error": null
}
```

**Network Mapping:**
| Currency | Networks |
|----------|----------|
| USDT | TRC20, BEP20, ERC20, POLYGON |
| BTC | BTC |
| ETH | ERC20 |
| BNB | BEP20 |
| TRX | TRC20 |
| NGN | BANK |

---

#### GET /wallets/:walletId/deposit-address

Get or create crypto deposit address.

**Auth Required:** Yes

**Query Parameters:**
- `network` (required): TRC20, BEP20, ERC20, BTC, POLYGON

**Response (200):**
```json
{
  "success": true,
  "data": {
    "address": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
    "network": "TRC20",
    "currency": "USDT",
    "minimumDeposit": 10,
    "confirmationsRequired": 20,
    "isNew": false,
    "transactionId": "tx-uuid"
  },
  "error": null
}
```

---

#### GET /wallets/:walletId/deposit-addresses

Get all deposit addresses for a wallet.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "addresses": [
      {
        "network": "TRC20",
        "address": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
        "createdAt": "2024-01-15T10:30:00Z"
      },
      {
        "network": "BEP20",
        "address": "0x1234567890abcdef1234567890abcdef12345678",
        "createdAt": "2024-01-16T14:00:00Z"
      }
    ]
  },
  "error": null
}
```

---

### Funding (NGN)

#### POST /fund-bank

Initialize NGN funding via Paystack.

**Auth Required:** Yes

**Request:**
```json
{
  "amount": 10000
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/abc123",
    "reference": "zorex_550e8400-e29b-41d4",
    "transactionId": "tx-uuid"
  },
  "error": null
}
```

---

### Withdrawals (Crypto)

#### POST /withdraw/crypto/estimate

Get withdrawal fee estimate.

**Auth Required:** Yes

**Request:**
```json
{
  "walletId": "wallet-uuid",
  "amount": 100,
  "network": "TRC20"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "amount": 100,
    "fee": 1,
    "totalDeducted": 101,
    "minAmount": 20,
    "currency": "USDT",
    "network": "TRC20"
  },
  "error": null
}
```

**Withdrawal Fees:**
| Network | Fee |
|---------|-----|
| TRC20 | 1 USDT |
| BEP20 | 0.5 USDT |
| ERC20 | 10 USDT |
| POLYGON | 0.5 USDT |
| BTC | 0.0001 BTC |

---

#### POST /withdraw/crypto

Initiate crypto withdrawal.

**Auth Required:** Yes

**Request:**
```json
{
  "walletId": "wallet-uuid",
  "amount": 100,
  "address": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
  "network": "TRC20"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx-uuid",
    "reference": "WD-550e8400-e29b-41d4",
    "amount": 100,
    "fee": 1,
    "totalDeducted": 101,
    "address": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
    "network": "TRC20",
    "status": "PENDING",
    "estimatedTime": "5-30 minutes"
  },
  "error": null
}
```

**Errors:**
- `400` - Insufficient balance
- `400` - Below minimum amount
- `400` - Invalid address format

---

#### GET /withdraw/crypto/pending

Get pending withdrawals.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "tx-uuid",
      "reference": "WD-550e8400-e29b-41d4",
      "amount": 100,
      "fee": 1,
      "address": "TQn9Y2...",
      "network": "TRC20",
      "status": "PENDING",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "error": null
}
```

---

#### POST /withdraw/crypto/:transactionId/cancel

Cancel a pending withdrawal.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Withdrawal cancelled and funds returned"
  },
  "error": null
}
```

**Errors:**
- `404` - Pending withdrawal not found
- `400` - Withdrawal already processing

---

### Transfers

#### POST /transfers/internal

Transfer funds between own wallets (same currency).

**Auth Required:** Yes

**Request:**
```json
{
  "fromWalletId": "sender-wallet-uuid",
  "toWalletId": "recipient-wallet-uuid",
  "amount": 500,
  "description": "Move to savings"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx-uuid",
    "reference": "TF-550e8400-e29b-41d4",
    "amount": 500,
    "fee": 0,
    "fromWallet": {
      "id": "sender-wallet-uuid",
      "currency": "USDT",
      "newBalance": "400.00"
    },
    "toWallet": {
      "id": "recipient-wallet-uuid",
      "currency": "USDT"
    },
    "status": "COMPLETED",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

---

#### POST /transfers/send

Transfer to another user by email.

**Auth Required:** Yes

**Request:**
```json
{
  "fromWalletId": "sender-wallet-uuid",
  "recipientEmail": "jane@example.com",
  "amount": 5000,
  "description": "Split bill"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx-uuid",
    "reference": "P2P-550e8400-e29b-41d4",
    "amount": 5000,
    "fee": 0,
    "fromWallet": {
      "id": "sender-wallet-uuid",
      "currency": "NGN",
      "newBalance": "145000.00"
    },
    "toWallet": {
      "id": "recipient-wallet-uuid",
      "currency": "NGN"
    },
    "status": "COMPLETED",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

**Errors:**
- `400` - Insufficient balance
- `400` - Cannot transfer to yourself
- `404` - Recipient not found
- `404` - Recipient has no matching currency wallet

---

#### GET /transfers/history

Get transfer history.

**Auth Required:** Yes

**Query Parameters:**
- `limit` (default: 20, max: 100)
- `offset` (default: 0)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transfers": [
      {
        "id": "tx-uuid",
        "reference": "P2P-550e8400-e29b-41d4",
        "type": "SENT",
        "amount": 5000,
        "fee": 0,
        "currency": "NGN",
        "status": "COMPLETED",
        "description": "Split bill",
        "counterparty": "jane@example.com",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0
    }
  },
  "error": null
}
```

---

### Transactions

#### GET /transactions

Get all transactions for authenticated user.

**Auth Required:** Yes

**Query Parameters:**
- `limit` (default: 20, max: 100)
- `offset` (default: 0)
- `type` (optional): FUNDING, PAYOUT, TRANSFER, PAYMENT
- `status` (optional): PENDING, COMPLETED, FAILED, REVERSED
- `walletId` (optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx-uuid",
        "reference": "zorex_abc123",
        "type": "FUNDING",
        "status": "COMPLETED",
        "amount": 10000,
        "currency": "NGN",
        "description": "Deposit via bank",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  },
  "error": null
}
```

---

#### GET /transactions/:id

Get transaction details.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "tx-uuid",
    "reference": "zorex_abc123",
    "type": "FUNDING",
    "status": "COMPLETED",
    "amount": 10000,
    "fee": 0,
    "currency": "NGN",
    "description": "Deposit via bank",
    "walletId": "wallet-uuid",
    "metadata": {
      "provider": "paystack",
      "network": "BANK"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

---

#### GET /transactions/wallet/:walletId

Get transactions for a specific wallet.

**Auth Required:** Yes

**Response (200):** Same format as GET /transactions

---

#### GET /transactions/stats

Get transaction statistics.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalDeposits": 150000,
    "totalWithdrawals": 50000,
    "totalTransfersSent": 25000,
    "totalTransfersReceived": 10000,
    "transactionCount": 45
  },
  "error": null
}
```

---

### Webhooks

#### POST /webhooks/paystack

Paystack payment notifications.

**Request Headers:**
- `x-paystack-signature` - HMAC SHA512 signature

**Response (200):**
```json
{
  "received": true
}
```

---

#### POST /webhooks/nowpayments

NOWPayments crypto deposit notifications.

**Request Headers:**
- `x-nowpayments-sig` - HMAC SHA512 signature

**Response (200):**
```json
{
  "received": true
}
```

---

#### POST /webhooks/nowpayments/payout

NOWPayments crypto payout notifications.

**Request Headers:**
- `x-nowpayments-sig` - HMAC SHA512 signature

**Response (200):**
```json
{
  "received": true
}
```

---

## Error Codes

| HTTP Code | Error Type | Description |
|-----------|------------|-------------|
| 400 | ValidationError | Invalid input data |
| 400 | LoginError | Invalid credentials |
| 400 | RefreshTokenError | Invalid/expired refresh token |
| 400 | InsufficientBalance | Not enough funds |
| 401 | Unauthorized | Missing/invalid access token |
| 403 | Forbidden | Action not permitted |
| 404 | NotFound | Resource doesn't exist |
| 409 | ConflictError | Resource already exists |
| 500 | InternalError | Server error |

---

## Webhook Security

### Paystack Signature Verification

```typescript
function verifyPaystackSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');
  return hash === signature;
}
```

### NOWPayments Signature Verification

```typescript
function verifyNowPaymentsSignature(
  payload: object,
  signature: string,
  secret: string
): boolean {
  // Sort keys alphabetically (required by NOWPayments)
  const sortedPayload = JSON.stringify(sortObjectKeys(payload));
  const hash = crypto
    .createHmac('sha512', secret)
    .update(sortedPayload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(signature)
  );
}
```

---

## SDK Example (TypeScript)

```typescript
class ZorexPayClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:5500/api') {
    this.baseUrl = baseUrl;
  }

  async login(email: string, password: string) {
    const res = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  }

  async getWallets() {
    const res = await fetch(`${this.baseUrl}/wallets`, {
      credentials: 'include',
    });
    return res.json();
  }

  async createWallet(currency: string) {
    const res = await fetch(`${this.baseUrl}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currency }),
    });
    return res.json();
  }

  async transfer(fromWalletId: string, toWalletId: string, amount: number) {
    const res = await fetch(`${this.baseUrl}/transfers/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ fromWalletId, toWalletId, amount }),
    });
    return res.json();
  }

  async sendToUser(fromWalletId: string, recipientEmail: string, amount: number) {
    const res = await fetch(`${this.baseUrl}/transfers/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ fromWalletId, recipientEmail, amount }),
    });
    return res.json();
  }

  async getTransactions(limit = 20, offset = 0) {
    const res = await fetch(
      `${this.baseUrl}/transactions?limit=${limit}&offset=${offset}`,
      { credentials: 'include' }
    );
    return res.json();
  }
}
```
