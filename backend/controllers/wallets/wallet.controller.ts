import type { Request, Response } from "express";
import { WalletService } from "../../services/wallet/wallet.service";
import { CryptoFundingService } from "../../services/funding/crypto.funding.service";
import { handleHttpError } from "../error.handler";
import { ValidationError } from "../../errors/domain.errors";
import type { currency_type, network_type } from "../../generated/prisma/client";

/**
 * GET /api/wallets
 * Get all wallets for the authenticated user
 */
export async function getWallets(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Unauthorized",
      });
    }

    const wallets = await WalletService.getUserWallets(userId);

    return res.json({
      success: true,
      data: { wallets },
      error: null,
    });
  } catch (error) {
    return handleHttpError(error, res);
  }
}

/**
 * POST /api/wallets
 * Create a new wallet for a specific currency
 */
export async function createWallet(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Unauthorized",
      });
    }

    const { currency } = req.body;

    if (!currency) {
      throw new ValidationError("Currency is required");
    }

    // Validate currency is one of our supported types
    const validCurrencies = ["NGN", "USDT", "BTC", "ETH", "BNB", "TRX"];
    if (!validCurrencies.includes(currency)) {
      throw new ValidationError(
        `Invalid currency. Supported: ${validCurrencies.join(", ")}`
      );
    }

    const wallet = await WalletService.createWallet(userId, currency as currency_type);

    return res.status(201).json({
      success: true,
      data: wallet,
      error: null,
    });
  } catch (error) {
    return handleHttpError(error, res);
  }
}

/**
 * GET /api/wallets/:walletId
 * Get wallet details by ID
 */
export async function getWalletById(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Unauthorized",
      });
    }

    const { walletId } = req.params;

    const wallet = await WalletService.getWalletById(walletId, userId);

    if (!wallet) {
      return res.status(404).json({
        success: false,
        data: null,
        error: "Wallet not found",
      });
    }

    return res.json({
      success: true,
      data: wallet,
      error: null,
    });
  } catch (error) {
    return handleHttpError(error, res);
  }
}

/**
 * GET /api/wallets/:walletId/balance
 * Get wallet balance
 */
export async function getWalletBalance(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Unauthorized",
      });
    }

    const { walletId } = req.params;

    const balance = await WalletService.getBalance(walletId, userId);

    return res.json({
      success: true,
      data: { balance },
      error: null,
    });
  } catch (error) {
    return handleHttpError(error, res);
  }
}

/**
 * GET /api/wallets/:walletId/deposit-address
 * Get or create a deposit address for a crypto wallet
 */
export async function getDepositAddress(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Unauthorized",
      });
    }

    const { walletId } = req.params;
    const { network } = req.query;

    if (!network || typeof network !== "string") {
      throw new ValidationError("Network is required (e.g., TRC20, BEP20, ERC20, BTC)");
    }

    // Validate network
    const validNetworks = ["TRC20", "BEP20", "ERC20", "POLYGON", "BTC"];
    if (!validNetworks.includes(network)) {
      throw new ValidationError(
        `Invalid network. Supported: ${validNetworks.join(", ")}`
      );
    }

    const result = await CryptoFundingService.getOrCreateDepositAddress(
      walletId,
      network as network_type,
      userId
    );

    return res.json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    return handleHttpError(error, res);
  }
}

/**
 * GET /api/wallets/:walletId/deposit-addresses
 * Get all deposit addresses for a wallet
 */
export async function getDepositAddresses(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Unauthorized",
      });
    }

    const { walletId } = req.params;

    const addresses = await CryptoFundingService.getDepositAddresses(walletId, userId);

    return res.json({
      success: true,
      data: { addresses },
      error: null,
    });
  } catch (error) {
    return handleHttpError(error, res);
  }
}

/**
 * GET /api/wallets/networks/:currency
 * Get valid networks for a currency
 */
export async function getNetworksForCurrency(req: Request, res: Response) {
  try {
    const { currency } = req.params;

    const validCurrencies = ["NGN", "USDT", "BTC", "ETH", "BNB", "TRX"];
    if (!validCurrencies.includes(currency)) {
      throw new ValidationError(
        `Invalid currency. Supported: ${validCurrencies.join(", ")}`
      );
    }

    const networks = WalletService.getValidNetworks(currency);

    return res.json({
      success: true,
      data: { currency, networks },
      error: null,
    });
  } catch (error) {
    return handleHttpError(error, res);
  }
}
