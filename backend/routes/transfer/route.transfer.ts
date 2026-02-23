import express, { Router } from "express";
import { requireAuth } from "../../middleware/request-auth";
import {
  internalTransfer,
  sendToUser,
  getTransferHistory,
} from "../../controllers/transfer/transfer.controller";

const router: Router = express.Router();

// All routes require authentication
router.use(requireAuth);

// POST /api/transfers/internal - Transfer between own wallets
router.post("/internal", internalTransfer);

// POST /api/transfers/send - Send to another user
router.post("/send", sendToUser);

// GET /api/transfers/history - Get transfer history
router.get("/history", getTransferHistory);

export default router;
