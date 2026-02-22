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
  "error": "Unauthorized"
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

#### POST /auth/register

Create a new user account. Automatically creates an NGN wallet.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "userName": "johndoe",
  "email": "john@example.com",
  "phone": "+2348012345678",
  "password": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "John",
    "lastName": "Doe",
    "userName": "johndoe",
    "email": "john@example.com",
    "phone": "+2348012345678",
    "role": "USER",
    "kycStatus": "UNVERIFIED",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

**Errors:**
- `400` - Validation error
- `409` - User already exists (email/username/phone)

---

#### POST /auth/login

Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "USER"
    }
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

#### POST /auth/refresh

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

**Errors:**
- `400` - Invalid or expired refresh token

---

#### POST /auth/revoke

Revoke refresh token (logout from specific device).

**Request:** No body required

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

#### POST /auth/logout

Clear all session cookies.

**Request:** No body required

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
    "currency": "NGN",
    "status": "ACTIVE",
    "balance": "150000.00",
    "paymentAccounts": [
      {
        "id": "account-uuid",
        "network": "BANK",
        "identifier": "1234567890",
        "provider": "PAYSTACK",
        "isActive": true
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

**Errors:**
- `404` - Wallet not found

---

#### GET /wallets/:walletId/transactions

Get transaction history for a wallet.

**Auth Required:** Yes

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `type` (optional): FUNDING, PAYOUT, TRANSFER, PAYMENT
- `status` (optional): PENDING, COMPLETED, FAILED, REVERSED

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx-uuid",
        "type": "FUNDING",
        "status": "COMPLETED",
        "reference": "zorex_abc123",
        "direction": "CREDIT",
        "amount": "10000.00",
        "currency": "NGN",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  },
  "error": null
}
```

---

### Funding

#### POST /funding/bank

Initialize NGN funding via Paystack.

**Auth Required:** Yes

**Request:**
```json
{
  "walletId": "wallet-uuid",
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

**Errors:**
- `400` - Invalid wallet or amount
- `404` - Wallet not found

---

#### GET /funding/crypto/address

Get or generate crypto deposit address.

**Auth Required:** Yes

**Query Parameters:**
- `walletId` (required)
- `network` (required): TRC20, BEP20, ERC20, BTC, POLYGON

**Response (200):**
```json
{
  "success": true,
  "data": {
    "address": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
    "network": "TRC20",
    "currency": "USDT",
    "minimumDeposit": "10.00",
    "confirmationsRequired": 20
  },
  "error": null
}
```

**Errors:**
- `400` - Invalid network or currency combination

---

### Transfers

#### POST /transfers

Transfer funds between wallets (internal).

**Auth Required:** Yes

**Request:**
```json
{
  "fromWalletId": "sender-wallet-uuid",
  "toWalletId": "recipient-wallet-uuid",
  "amount": 5000,
  "note": "Payment for services"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx-uuid",
    "reference": "zorex_transfer_abc123",
    "status": "COMPLETED",
    "amount": "5000.00",
    "fee": "0.00",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

**Errors:**
- `400` - Insufficient balance
- `400` - Same wallet transfer not allowed
- `400` - Currency mismatch
- `404` - Wallet not found

---

#### POST /transfers/username

Transfer to another user by username.

**Auth Required:** Yes

**Request:**
```json
{
  "fromWalletId": "sender-wallet-uuid",
  "recipientUsername": "janedoe",
  "currency": "NGN",
  "amount": 5000,
  "note": "Split bill"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx-uuid",
    "reference": "zorex_transfer_abc123",
    "status": "COMPLETED",
    "recipient": {
      "userName": "janedoe",
      "firstName": "Jane"
    },
    "amount": "5000.00",
    "fee": "0.00"
  },
  "error": null
}
```

---

### Payouts

#### POST /payouts/bank

Withdraw NGN to bank account.

**Auth Required:** Yes

**Request:**
```json
{
  "walletId": "wallet-uuid",
  "amount": 50000,
  "bankCode": "058",
  "accountNumber": "1234567890",
  "accountName": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx-uuid",
    "reference": "zorex_payout_abc123",
    "status": "PENDING",
    "amount": "50000.00",
    "fee": "50.00",
    "estimatedArrival": "2024-01-15T12:00:00Z"
  },
  "error": null
}
```

**Errors:**
- `400` - Insufficient balance
- `400` - Invalid bank details

---

#### POST /payouts/crypto

Withdraw crypto to external wallet.

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
    "reference": "zorex_crypto_payout_abc123",
    "status": "PENDING",
    "amount": "100.00",
    "fee": "1.00",
    "network": "TRC20",
    "estimatedConfirmations": 20
  },
  "error": null
}
```

---

### Rates

#### GET /rates

Get current exchange rates.

**Auth Required:** No

**Response (200):**
```json
{
  "success": true,
  "data": {
    "rates": [
      {
        "from": "NGN",
        "to": "USDT",
        "rate": "0.00062",
        "updatedAt": "2024-01-15T10:30:00Z"
      },
      {
        "from": "USDT",
        "to": "NGN",
        "rate": "1610.00",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "error": null
}
```

---

#### GET /rates/:from/:to

Get specific exchange rate.

**Auth Required:** No

**Response (200):**
```json
{
  "success": true,
  "data": {
    "from": "NGN",
    "to": "USDT",
    "rate": "0.00062",
    "inverseRate": "1612.90",
    "updatedAt": "2024-01-15T10:30:00Z"
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

**Request Body:** Raw JSON from Paystack

**Response (200):**
```json
{
  "received": true
}
```

---

#### POST /webhooks/nowpayments

NOWPayments crypto notifications.

**Request Headers:**
- `x-nowpayments-sig` - HMAC SHA512 signature

**Request Body:** Raw JSON from NOWPayments

**Response (200):**
```json
{
  "received": true
}
```

---

### User Profile

#### GET /profile

Get current user profile.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "userName": "johndoe",
    "email": "john@example.com",
    "phone": "+2348012345678",
    "role": "USER",
    "kycStatus": "VERIFIED",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

---

#### PATCH /profile

Update user profile.

**Auth Required:** Yes

**Request:**
```json
{
  "firstName": "Johnny",
  "phone": "+2348087654321"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "firstName": "Johnny",
    "phone": "+2348087654321"
  },
  "error": null
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
| 429 | RateLimited | Too many requests |
| 500 | InternalError | Server error |

---

## Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| Authentication | 10 req/min |
| Funding/Payouts | 20 req/min |
| Transfers | 30 req/min |
| Read operations | 100 req/min |

---

## Webhook Security

### Paystack

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

### NOWPayments

```typescript
function verifyNowPaymentsSignature(
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

---

## SDK Example (TypeScript)

```typescript
class ZorexPayClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async login(email: string, password: string) {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
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

  async transfer(fromWalletId: string, toWalletId: string, amount: number) {
    const res = await fetch(`${this.baseUrl}/transfers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ fromWalletId, toWalletId, amount }),
    });
    return res.json();
  }
}
```
