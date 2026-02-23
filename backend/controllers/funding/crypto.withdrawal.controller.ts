import type { Request, Response } from "express";
import { CryptoWithdrawalService } from "../../services/funding/crypto.withdrawal.service";
import { handleHttpError } from "../error.handler";
import { z } from "zod";
import type { network_type } from "../../generated/prisma/client";

// Validation schemas
const withdrawalEstimateSchema = z.object({
  walletId: z.string().uuid(),
  amount: z.number().positive(),
  network: z.enum(["TRC20", "BEP20", "ERC20", "POLYGON", "BTC"]),
});

const initiateWithdrawalSchema = z.object({
  walletId: z.string().uuid(),
  amount: z.number().positive(),
  address: z.string().min(20).max(100),
  network: z.enum(["TRC20", "BEP20", "ERC20", "POLYGON", "BTC"]),
});

/**
 * POST /api/withdraw/crypto/estimate
 * Get withdrawal estimate with fees
 */
export async function getWithdrawalEstimate(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Authentication required",
      });
    }

    const validation = withdrawalEstimateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        data: null,
        error: validation.error.issues[0].message,
      });
    }

    const { walletId, amount, network } = validation.data;

    const estimate = await CryptoWithdrawalService.getWithdrawalEstimate(
      walletId,
      userId,
      amount,
      network as network_type
    );

    return res.json({
      success: true,
      data: estimate,
      error: null,
    });
  } catch (error) {
    return handleHttpError(error, res);
  }
}

/**
 * POST /api/withdraw/crypto
 * Initiate a crypto withdrawal
 */
export async function initiateWithdrawal(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Authentication required",
      });
    }

    const validation = initiateWithdrawalSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        data: null,
        error: validation.error.issues[0].message,
      });
    }

    const { walletId, amount, address, network } = validation.data;

    const result = await CryptoWithdrawalService.initiateWithdrawal({
      walletId,
      userId,
      amount,
      address,
      network: network as network_type,
    });

    return res.status(201).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    return handleHttpError(error, res);
  }
}

/**
 * GET /api/withdraw/crypto/pending
 * Get pending withdrawals for authenticated user
 */
export async function getPendingWithdrawals(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Authentication required",
      });
    }

    const withdrawals = await CryptoWithdrawalService.getPendingWithdrawals(userId);

    return res.json({
      success: true,
      data: withdrawals,
      error: null,
    });
  } catch (error) {
    return handleHttpError(error, res);
  }
}

/**
 * POST /api/withdraw/crypto/:transactionId/cancel
 * Cancel a pending withdrawal
 */
export async function cancelWithdrawal(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Authentication required",
      });
    }

    const { transactionId } = req.params;
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: "Transaction ID required",
      });
    }

    const result = await CryptoWithdrawalService.cancelWithdrawal(transactionId, userId);

    return res.json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    return handleHttpError(error, res);
  }
}
