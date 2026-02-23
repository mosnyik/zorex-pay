import { prisma } from "../../lib/prisma";
import { LedgerRepo } from "../../repository/ledger/ledger.repo";
import { ValidationError, NotFoundError, InsufficientBalanceError } from "../../errors/domain.errors";
import { v4 as uuidv4 } from "uuid";
import logger from "../../logger";

// Transfer fees (percentage-based)
const TRANSFER_FEE_PERCENT = 0; // 0% for internal transfers

export interface InternalTransferRequest {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  userId: string;
  description?: string;
}

export interface UserToUserTransferRequest {
  fromWalletId: string;
  recipientEmail: string;
  amount: number;
  userId: string;
  description?: string;
}

export interface TransferResponse {
  transactionId: string;
  reference: string;
  amount: number;
  fee: number;
  fromWallet: {
    id: string;
    currency: string;
    newBalance: string;
  };
  toWallet: {
    id: string;
    currency: string;
  };
  status: string;
  createdAt: Date;
}

export const TransferService = {
  /**
   * Transfer between user's own wallets (same currency only)
   * For cross-currency, would need exchange rate integration
   */
  async internalTransfer(request: InternalTransferRequest): Promise<TransferResponse> {
    const { fromWalletId, toWalletId, amount, userId, description } = request;

    // Validate amount
    if (amount <= 0) {
      throw new ValidationError("Transfer amount must be positive");
    }

    // Cannot transfer to same wallet
    if (fromWalletId === toWalletId) {
      throw new ValidationError("Cannot transfer to the same wallet");
    }

    // Get source wallet with balance
    const fromWallet = await prisma.wallets.findFirst({
      where: { id: fromWalletId, user_id: userId },
      include: {
        ledger: { include: { entries: true } },
      },
    });

    if (!fromWallet) {
      throw new NotFoundError("Source wallet not found");
    }

    // Get destination wallet (must belong to same user for internal transfer)
    const toWallet = await prisma.wallets.findFirst({
      where: { id: toWalletId, user_id: userId },
    });

    if (!toWallet) {
      throw new NotFoundError("Destination wallet not found");
    }

    // Validate same currency
    if (fromWallet.currency !== toWallet.currency) {
      throw new ValidationError(
        `Currency mismatch: ${fromWallet.currency} to ${toWallet.currency}. Cross-currency transfers not yet supported.`
      );
    }

    // Calculate balance and validate
    const balance = calculateBalance(fromWallet.ledger);
    const fee = amount * TRANSFER_FEE_PERCENT;
    const totalDebit = amount + fee;

    if (balance < totalDebit) {
      throw new InsufficientBalanceError(
        `Insufficient balance. Available: ${balance.toFixed(4)}, Required: ${totalDebit.toFixed(4)}`
      );
    }

    // Generate reference
    const reference = `TF-${uuidv4()}`;

    // Execute transfer atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.transactions.create({
        data: {
          reference,
          type: "TRANSFER",
          status: "COMPLETED",
          metadata: {
            fromWalletId,
            toWalletId,
            fromUserId: userId,
            toUserId: userId,
            amount,
            fee,
            currency: fromWallet.currency,
            description: description || "Internal wallet transfer",
            completedAt: new Date().toISOString(),
          },
        },
      });

      // Create ledger entries
      await LedgerRepo.createLedgerTransferEntries(tx, {
        transactionId: transaction.id,
        fromWalletId,
        toWalletId,
        amount,
        fee,
      });

      // Calculate new balance
      const newBalance = await LedgerRepo.getBalance(tx, fromWalletId);

      return {
        transaction,
        newBalance,
      };
    });

    logger.info("Internal transfer completed", {
      reference,
      fromWalletId,
      toWalletId,
      amount,
      currency: fromWallet.currency,
    });

    return {
      transactionId: result.transaction.id,
      reference,
      amount,
      fee,
      fromWallet: {
        id: fromWalletId,
        currency: fromWallet.currency,
        newBalance: result.newBalance.toFixed(2),
      },
      toWallet: {
        id: toWalletId,
        currency: toWallet.currency,
      },
      status: "COMPLETED",
      createdAt: result.transaction.created_at,
    };
  },

  /**
   * Transfer to another user by email
   */
  async userToUserTransfer(request: UserToUserTransferRequest): Promise<TransferResponse> {
    const { fromWalletId, recipientEmail, amount, userId, description } = request;

    // Validate amount
    if (amount <= 0) {
      throw new ValidationError("Transfer amount must be positive");
    }

    // Get sender's wallet with user info
    const fromWallet = await prisma.wallets.findFirst({
      where: { id: fromWalletId, user_id: userId },
      include: {
        ledger: { include: { entries: true } },
        users: true,
      },
    });

    if (!fromWallet) {
      throw new NotFoundError("Source wallet not found");
    }

    // Cannot send to self
    if (fromWallet.users.email.toLowerCase() === recipientEmail.toLowerCase()) {
      throw new ValidationError("Cannot transfer to yourself. Use internal transfer instead.");
    }

    // Find recipient user
    const recipient = await prisma.users.findUnique({
      where: { email: recipientEmail.toLowerCase() },
    });

    if (!recipient) {
      throw new NotFoundError("Recipient not found");
    }

    // Find or validate recipient has wallet of same currency
    const toWallet = await prisma.wallets.findFirst({
      where: {
        user_id: recipient.id,
        currency: fromWallet.currency,
      },
    });

    if (!toWallet) {
      throw new NotFoundError(
        `Recipient does not have a ${fromWallet.currency} wallet`
      );
    }

    // Calculate balance and validate
    const balance = calculateBalance(fromWallet.ledger);
    const fee = amount * TRANSFER_FEE_PERCENT;
    const totalDebit = amount + fee;

    if (balance < totalDebit) {
      throw new InsufficientBalanceError(
        `Insufficient balance. Available: ${balance.toFixed(4)}, Required: ${totalDebit.toFixed(4)}`
      );
    }

    // Generate reference
    const reference = `P2P-${uuidv4()}`;

    // Execute transfer atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.transactions.create({
        data: {
          reference,
          type: "TRANSFER",
          status: "COMPLETED",
          metadata: {
            fromWalletId,
            toWalletId: toWallet.id,
            fromUserId: userId,
            toUserId: recipient.id,
            amount,
            fee,
            currency: fromWallet.currency,
            recipientEmail,
            description: description || `Transfer to ${recipientEmail}`,
            completedAt: new Date().toISOString(),
          },
        },
      });

      // Create ledger entries
      await LedgerRepo.createLedgerTransferEntries(tx, {
        transactionId: transaction.id,
        fromWalletId,
        toWalletId: toWallet.id,
        amount,
        fee,
      });

      // Calculate new balance
      const newBalance = await LedgerRepo.getBalance(tx, fromWalletId);

      return {
        transaction,
        newBalance,
      };
    });

    logger.info("P2P transfer completed", {
      reference,
      fromUserId: userId,
      toUserId: recipient.id,
      amount,
      currency: fromWallet.currency,
    });

    return {
      transactionId: result.transaction.id,
      reference,
      amount,
      fee,
      fromWallet: {
        id: fromWalletId,
        currency: fromWallet.currency,
        newBalance: result.newBalance.toFixed(2),
      },
      toWallet: {
        id: toWallet.id,
        currency: toWallet.currency,
      },
      status: "COMPLETED",
      createdAt: result.transaction.created_at,
    };
  },

  /**
   * Get transfer history for a user
   */
  async getTransferHistory(userId: string, limit: number = 20, offset: number = 0) {
    // Get transfers where user is sender or receiver
    const transfers = await prisma.transactions.findMany({
      where: {
        type: "TRANSFER",
        OR: [
          {
            metadata: {
              path: ["fromUserId"],
              equals: userId,
            },
          },
          {
            metadata: {
              path: ["toUserId"],
              equals: userId,
            },
          },
        ],
      },
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
    });

    return transfers.map((tx) => {
      const metadata = tx.metadata as any;
      const isSender = metadata.fromUserId === userId;

      return {
        id: tx.id,
        reference: tx.reference,
        type: isSender ? "SENT" : "RECEIVED",
        amount: metadata.amount,
        fee: metadata.fee,
        currency: metadata.currency,
        status: tx.status,
        description: metadata.description,
        counterparty: isSender ? metadata.recipientEmail || "Own wallet" : "Received",
        createdAt: tx.created_at,
      };
    });
  },
};

/**
 * Calculate balance from ledger entries
 */
function calculateBalance(ledgerAccounts: Array<{ entries: Array<{ direction: string; amount: any }> }>): number {
  let balance = 0;
  for (const account of ledgerAccounts) {
    for (const entry of account.entries) {
      const amount = parseFloat(entry.amount?.toString() || "0");
      if (entry.direction === "CREDIT") {
        balance += amount;
      } else {
        balance -= amount;
      }
    }
  }
  return balance;
}

export default TransferService;
