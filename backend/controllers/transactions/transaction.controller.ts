import type { Request, Response } from "express";
import { TransactionService } from "../../services/transactions/transaction.service";
import { handleHttpError } from "../error.handler";
import type { transaction_type } from "../../generated/prisma/client";

/**
 * GET /api/transactions
 * Get all transactions for authenticated user
 */
export async function getTransactions(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Authentication required",
      });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as transaction_type | undefined;
    const status = req.query.status as string | undefined;
    const walletId = req.query.walletId as string | undefined;

    const result = await TransactionService.getUserTransactions(
      userId,
      { type, status, walletId },
      limit,
      offset
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
 * GET /api/transactions/:id
 * Get a single transaction by ID
 */
export async function getTransactionById(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Authentication required",
      });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        data: null,
        error: "Transaction ID required",
      });
    }

    const transaction = await TransactionService.getTransactionById(id, userId);

    return res.json({
      success: true,
      data: transaction,
      error: null,
    });
  } catch (error) {
    return handleHttpError(error, res);
  }
}

/**
 * GET /api/transactions/wallet/:walletId
 * Get transactions for a specific wallet
 */
export async function getWalletTransactions(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Authentication required",
      });
    }

    const { walletId } = req.params;
    if (!walletId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: "Wallet ID required",
      });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await TransactionService.getWalletTransactions(
      walletId,
      userId,
      limit,
      offset
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
 * GET /api/transactions/stats
 * Get transaction statistics for authenticated user
 */
export async function getTransactionStats(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Authentication required",
      });
    }

    const stats = await TransactionService.getTransactionStats(userId);

    return res.json({
      success: true,
      data: stats,
      error: null,
    });
  } catch (error) {
    return handleHttpError(error, res);
  }
}
