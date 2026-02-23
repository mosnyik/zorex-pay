import express, { Router } from "express";
import { requireAuth } from "../../middleware/request-auth";
import {
  getWallets,
  createWallet,
  getWalletById,
  getWalletBalance,
  getDepositAddress,
  getDepositAddresses,
  getNetworksForCurrency,
} from "../../controllers/wallets/wallet.controller";

const router: Router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/wallets - Get all wallets
router.get("/", getWallets);

// POST /api/wallets - Create a new wallet
router.post("/", createWallet);

// GET /api/wallets/networks/:currency - Get valid networks for a currency
router.get("/networks/:currency", getNetworksForCurrency);

// GET /api/wallets/:walletId - Get wallet by ID
router.get("/:walletId", getWalletById);

// GET /api/wallets/:walletId/balance - Get wallet balance
router.get("/:walletId/balance", getWalletBalance);

// GET /api/wallets/:walletId/deposit-address - Get/create deposit address
router.get("/:walletId/deposit-address", getDepositAddress);

// GET /api/wallets/:walletId/deposit-addresses - Get all deposit addresses
router.get("/:walletId/deposit-addresses", getDepositAddresses);

export default router;
