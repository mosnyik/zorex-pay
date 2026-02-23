import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../errors/domain.errors";
import type { transaction_type } from "../../generated/prisma/client";

export interface TransactionSummary {
  id: string;
  reference: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: Date;
}

export interface TransactionDetails extends TransactionSummary {
  fee: number;
  walletId: string;
  metadata: Record<string, any>;
}

export interface TransactionFilters {
  type?: transaction_type;
  status?: string;
  walletId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface PaginatedTransactions {
  transactions: TransactionSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const TransactionService = {
  /**
   * Get all transactions for a user with optional filters
   */
  async getUserTransactions(
    userId: string,
    filters: TransactionFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedTransactions> {
    // Build filter conditions
    const conditions: any[] = [
      {
        metadata: {
          path: ["userId"],
          equals: userId,
        },
      },
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
    ];

    const where: any = {
      OR: conditions,
    };

    // Apply additional filters
    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.walletId) {
      where.OR = [
        {
          metadata: {
            path: ["walletId"],
            equals: filters.walletId,
          },
        },
        {
          metadata: {
            path: ["fromWalletId"],
            equals: filters.walletId,
          },
        },
        {
          metadata: {
            path: ["toWalletId"],
            equals: filters.walletId,
          },
        },
      ];
    }

    if (filters.fromDate || filters.toDate) {
      where.created_at = {};
      if (filters.fromDate) {
        where.created_at.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.created_at.lte = filters.toDate;
      }
    }

    // Get total count
    const total = await prisma.transactions.count({ where });

    // Get transactions
    const transactions = await prisma.transactions.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
    });

    const summaries = transactions.map((tx) => formatTransaction(tx, userId));

    return {
      transactions: summaries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + transactions.length < total,
      },
    };
  },

  /**
   * Get a single transaction by ID
   */
  async getTransactionById(
    transactionId: string,
    userId: string
  ): Promise<TransactionDetails> {
    const transaction = await prisma.transactions.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundError("Transaction not found");
    }

    const metadata = transaction.metadata as any;

    // Verify user has access to this transaction
    const hasAccess =
      metadata.userId === userId ||
      metadata.fromUserId === userId ||
      metadata.toUserId === userId;

    if (!hasAccess) {
      throw new NotFoundError("Transaction not found");
    }

    return formatTransactionDetails(transaction, userId);
  },

  /**
   * Get transactions for a specific wallet
   */
  async getWalletTransactions(
    walletId: string,
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedTransactions> {
    // Verify wallet ownership
    const wallet = await prisma.wallets.findFirst({
      where: { id: walletId, user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundError("Wallet not found");
    }

    // Get transactions for this wallet
    const where = {
      OR: [
        {
          metadata: {
            path: ["walletId"],
            equals: walletId,
          },
        },
        {
          metadata: {
            path: ["fromWalletId"],
            equals: walletId,
          },
        },
        {
          metadata: {
            path: ["toWalletId"],
            equals: walletId,
          },
        },
      ],
    };

    const total = await prisma.transactions.count({ where });

    const transactions = await prisma.transactions.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
    });

    const summaries = transactions.map((tx) => formatTransaction(tx, userId));

    return {
      transactions: summaries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + transactions.length < total,
      },
    };
  },

  /**
   * Get transaction statistics for a user
   */
  async getTransactionStats(userId: string) {
    // Get all user transactions
    const transactions = await prisma.transactions.findMany({
      where: {
        OR: [
          { metadata: { path: ["userId"], equals: userId } },
          { metadata: { path: ["fromUserId"], equals: userId } },
          { metadata: { path: ["toUserId"], equals: userId } },
        ],
      },
    });

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalTransfersSent = 0;
    let totalTransfersReceived = 0;
    let transactionCount = transactions.length;

    for (const tx of transactions) {
      const metadata = tx.metadata as any;
      const amount = metadata.amount || metadata.withdrawalAmount || 0;

      switch (tx.type) {
        case "FUNDING":
          if (tx.status === "COMPLETED") {
            totalDeposits += amount;
          }
          break;
        case "PAYOUT":
          if (tx.status === "COMPLETED") {
            totalWithdrawals += amount;
          }
          break;
        case "TRANSFER":
          if (tx.status === "COMPLETED") {
            if (metadata.fromUserId === userId) {
              totalTransfersSent += amount;
            }
            if (metadata.toUserId === userId) {
              totalTransfersReceived += amount;
            }
          }
          break;
      }
    }

    return {
      totalDeposits,
      totalWithdrawals,
      totalTransfersSent,
      totalTransfersReceived,
      transactionCount,
    };
  },
};

/**
 * Format transaction for API response
 */
function formatTransaction(tx: any, userId: string): TransactionSummary {
  const metadata = tx.metadata as any;

  let amount = metadata.amount || metadata.withdrawalAmount || metadata.totalAmount || 0;
  let description = metadata.description || "";
  let currency = metadata.currency || "UNKNOWN";

  // Determine direction-based description
  switch (tx.type) {
    case "FUNDING":
      description = description || `Deposit via ${metadata.network || "bank"}`;
      break;
    case "PAYOUT":
      description = description || `Withdrawal to ${metadata.address?.slice(0, 10)}...`;
      break;
    case "TRANSFER":
      if (metadata.fromUserId === userId) {
        description = description || `Sent to ${metadata.recipientEmail || "own wallet"}`;
      } else {
        description = description || "Received transfer";
      }
      break;
    case "PAYMENT":
      description = description || "Payment";
      break;
  }

  return {
    id: tx.id,
    reference: tx.reference,
    type: tx.type,
    status: tx.status,
    amount,
    currency,
    description,
    createdAt: tx.created_at,
  };
}

/**
 * Format transaction details for API response
 */
function formatTransactionDetails(tx: any, userId: string): TransactionDetails {
  const summary = formatTransaction(tx, userId);
  const metadata = tx.metadata as any;

  return {
    ...summary,
    fee: metadata.fee || 0,
    walletId: metadata.walletId || metadata.fromWalletId || "",
    metadata: {
      ...metadata,
      // Remove sensitive data
      payoutId: undefined,
      paymentId: undefined,
    },
  };
}

export default TransactionService;
