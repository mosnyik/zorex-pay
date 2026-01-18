# Zorex Pay

Zorex Pay is a **full-stack payment system** built as a portfolio project to demonstrate
**production-grade backend and frontend architecture** for handling wallets, transfers,
and multi-currency transactions.

The project focuses on **correctness, safety, and clarity** rather than feature breadth
or commercial completeness.

> This is a portfolio project and does not process real funds.

---

## Project Overview

Zorex Pay models how a real-world payment platform could support:

- Fiat and crypto wallets
- Ledger-backed balance tracking
- Internal and external transfers
- Secure authentication and authorization
- Admin visibility and auditing

The system is intentionally designed to reflect **real payment infrastructure constraints**,
including idempotency, auditability, and failure handling.

---

## Architecture Overview

Frontend (Web App)
|
v
Backend API

Authentication

Wallets

Ledger & Transactions
|
v
External Providers

Bank APIs

Blockchain Networks



- The **backend** owns all financial logic and accounting
- The **frontend** consumes the API and handles user interaction
- Balances are derived from ledger entries, never stored directly

---

## Tech Stack

### Backend
- Node.js + TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Blockchain SDKs (Ethers, Web3, TronWeb)

### Frontend
- React / Next.js
- TypeScript
- API-based state management

---

## Repository Structure

zorex-pay/
├── README.md # System-level overview (this file)
├── backend/ # Payment logic, ledger, transactions
│ └── README.md
├── frontend/ # User interface and client logic
│ └── README.md
└── docs/ # Design notes and diagrams



---

## Documentation

- **Backend design & ledger model**  
  See [`backend/README.md`](./backend/README.md)

- **Frontend architecture & UX flows**  
  See [`frontend/README.md`](./frontend/README.md)

- **Additional design notes**  
  See [`docs/`](./docs)

---

## Running the Project Locally

High-level steps:

1. Start the backend API
2. Start the frontend web app
3. Access the frontend in the browser

Each subproject contains detailed setup instructions in its own README.

---

## Design Philosophy

This project intentionally prioritizes:

- explicit financial rules
- auditability over convenience
- correctness over shortcuts
- clear separation of concerns

Many common demo shortcuts (stored balances, implicit state changes)
are deliberately avoided to better reflect production systems.

---

## License

MIT
