import type { Request, Response } from "express";
import { TransferService } from "../../services/transfer/transfer.service";
import { handleHttpError } from "../error.handler";
import { z } from "zod";

// Validation schemas
const internalTransferSchema = z.object({
  fromWalletId: z.string().uuid(),
  toWalletId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().max(200).optional(),
});

const p2pTransferSchema = z.object({
  fromWalletId: z.string().uuid(),
  recipientEmail: z.string().email(),
  amount: z.number().positive(),
  description: z.string().max(200).optional(),
});

/**
 * POST /api/transfers/internal
 * Transfer between user's own wallets
 */
export async function internalTransfer(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Authentication required",
      });
    }

    const validation = internalTransferSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        data: null,
        error: validation.error.issues[0].message,
      });
    }

    const { fromWalletId, toWalletId, amount, description } = validation.data;

    const result = await TransferService.internalTransfer({
      fromWalletId,
      toWalletId,
      amount,
      userId,
      description,
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
 * POST /api/transfers/send
 * Transfer to another user by email
 */
export async function sendToUser(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Authentication required",
      });
    }

    const validation = p2pTransferSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        data: null,
        error: validation.error.issues[0].message,
      });
    }

    const { fromWalletId, recipientEmail, amount, description } = validation.data;

    const result = await TransferService.userToUserTransfer({
      fromWalletId,
      recipientEmail,
      amount,
      userId,
      description,
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
 * GET /api/transfers/history
 * Get transfer history for authenticated user
 */
export async function getTransferHistory(req: Request, res: Response) {
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

    const history = await TransferService.getTransferHistory(userId, limit, offset);

    return res.json({
      success: true,
      data: {
        transfers: history,
        pagination: { limit, offset },
      },
      error: null,
    });
  } catch (error) {
    return handleHttpError(error, res);
  }
}
