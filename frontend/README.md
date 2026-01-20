# Zorex Pay – Frontend

### Web Client for the Zorex Pay Payment System

This frontend application is the client-facing interface for **Zorex Pay**, a full-stack
payment system designed as a **portfolio-grade project**.

The frontend focuses on:
- consuming a ledger-backed payment API
- presenting wallet and transaction data safely
- handling authentication and session lifecycle
- providing clear user feedback for financial operations

---

## Scope & Responsibilities

The frontend is intentionally **thin** and does **not** contain business or financial logic.

### In Scope
- User authentication (login, logout, token refresh)
- Wallet overview and status display
- Transaction history views
- Initiating transfers, funding, and withdrawals
- Handling loading, error, and retry states
- Role-aware UI (user vs admin)

### Out of Scope
- Balance calculations
- Ledger logic
- Transaction validation
- Fee computation

All financial rules are enforced exclusively by the backend.

---

## Architecture Overview
```plaintext
UI Components
|
State / API Layer
|
REST API (Backend)
|
Ledger & Transactions
```

The frontend communicates with the backend **only via HTTP APIs** and treats the backend
as the single source of truth.

---

## Authentication Flow

- Users authenticate using email and password
- Backend issues:
  - short-lived access token (5 minutes)
  - refresh token (24 hours)
- Access tokens are attached to API requests
- Refresh token is used to obtain new access tokens when expired
- Logout explicitly revokes refresh tokens

The frontend never stores or infers financial state from tokens.

---

## Wallet & Balance Display

- Wallets are fetched from the backend API
- Displayed balances are backend-calculated values
- Wallet status is respected:
  - ACTIVE → actions enabled
  - FROZEN → actions disabled with explanation

No balance math is performed client-side.

---

## Transfers & Transactions

### User Actions
- Internal transfers
- External funding (bank / crypto)
- Withdrawals

### UI Behavior
- Submit request → show pending state
- Await backend confirmation
- Reflect final transaction status:
  - PENDING
  - COMPLETED
  - FAILED
  - REVERSED

All operations are assumed to be **retryable** and **idempotent**.

---

## Error Handling

The frontend explicitly handles:
- network failures
- authorization errors
- validation errors
- backend-reported transaction failures

User-facing error messages are derived from backend responses,
never inferred locally.

---

## Admin Views (If Enabled)

When authenticated as an admin user, the UI may expose:
- wallet inspection
- transaction history
- system-level visibility

Authorization is enforced by the backend; the frontend only adapts presentation.

---

## State Management

- API-driven state
- No long-lived derived financial state
- UI state resets safely on logout or token expiry

This avoids stale or incorrect financial displays.

---

## Technology Stack

- React / Next.js
- TypeScript
- Fetch / Axios for API communication
- Modular component architecture

---

## Running the Frontend Locally

```bash
pnpm install
pnpm dev
```

---
The frontend expects the backend API to be running and accessible.

Configuration such as API base URLs is provided via environment variables.
---

## Design Notes

This frontend intentionally avoids:

duplicating backend logic

optimistic balance updates

hidden state mutations

The goal is to reflect how real payment clients safely interact
with authoritative backend systems.

---

## Related Documentation

Backend design & ledger model:
See [`backend/README.md`](./backend/README.md)

System overview:
See [`Root/README.md`](../README.md)
 