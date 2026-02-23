import express, { Router } from "express";
import { requireAuth } from "../../middleware/request-auth";
import {
  getWithdrawalEstimate,
  initiateWithdrawal,
  getPendingWithdrawals,
  cancelWithdrawal,
} from "../../controllers/funding/crypto.withdrawal.controller";

const router: Router = express.Router();

// All routes require authentication
router.use(requireAuth);

// POST /api/withdraw/crypto/estimate - Get withdrawal estimate with fees
router.post("/estimate", getWithdrawalEstimate);

// POST /api/withdraw/crypto - Initiate a crypto withdrawal
router.post("/", initiateWithdrawal);

// GET /api/withdraw/crypto/pending - Get pending withdrawals
router.get("/pending", getPendingWithdrawals);

// POST /api/withdraw/crypto/:transactionId/cancel - Cancel pending withdrawal
router.post("/:transactionId/cancel", cancelWithdrawal);

export default router;
