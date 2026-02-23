import express, { Router } from "express";
import { requireAuth } from "../../middleware/request-auth";
import {
  getTransactions,
  getTransactionById,
  getWalletTransactions,
  getTransactionStats,
} from "../../controllers/transactions/transaction.controller";

const router: Router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/transactions - Get all transactions
router.get("/", getTransactions);

// GET /api/transactions/stats - Get transaction statistics
router.get("/stats", getTransactionStats);

// GET /api/transactions/wallet/:walletId - Get wallet transactions
router.get("/wallet/:walletId", getWalletTransactions);

// GET /api/transactions/:id - Get single transaction (must be after /stats and /wallet)
router.get("/:id", getTransactionById);

export default router;
