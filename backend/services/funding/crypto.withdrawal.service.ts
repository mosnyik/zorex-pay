import { prisma } from "../../lib/prisma";
import { LedgerRepo } from "../../repository/ledger/ledger.repo";
import { NowPaymentsService } from "../crypto/nowpayments.service";
import { ValidationError, NotFoundError, InsufficientBalanceError } from "../../errors/domain.errors";
import { v4 as uuidv4 } from "uuid";
import logger from "../../logger";
import type { network_type } from "../../generated/prisma/client";

// Minimum withdrawal amounts (in crypto units)
const MIN_WITHDRAWAL: Record<string, number> = {
  usdttrc20: 20,
  usdtbsc: 20,
  usdterc20: 100, // Higher due to gas fees
  usdtmatic: 20,
  btc: 0.001,
  eth: 0.02,
  bnb: 0.1,
  trx: 100,
};

// Withdrawal fees (flat fee in crypto units)
const WITHDRAWAL_FEES: Record<string, number> = {
  usdttrc20: 1,
  usdtbsc: 0.5,
  usdterc20: 10, // Higher due to gas
  usdtmatic: 0.5,
  btc: 0.0001,
  eth: 0.002,
  bnb: 0.005,
  trx: 5,
};

export interface WithdrawalRequest {
  walletId: string;
  userId: string;
  amount: number;
  address: string;
  network: network_type;
}

export interface WithdrawalResponse {
  transactionId: string;
  reference: string;
  amount: number;
  fee: number;
  totalDeducted: number;
  address: string;
  network: string;
  status: string;
  estimatedTime: string;
}

export interface WithdrawalEstimate {
  amount: number;
  fee: number;
  totalDeducted: number;
  minAmount: number;
  currency: string;
  network: string;
}

export const CryptoWithdrawalService = {
  /**
   * Get withdrawal estimate including fees
   */
  async getWithdrawalEstimate(
    walletId: string,
    userId: string,
    amount: number,
    network: network_type
  ): Promise<WithdrawalEstimate> {
    // Verify wallet ownership
    const wallet = await prisma.wallets.findFirst({
      where: { id: walletId, user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundError("Wallet not found");
    }

    // Map to NOWPayments currency
    const nowPaymentsCurrency = NowPaymentsService.mapToNowPaymentsCurrency(
      wallet.currency,
      network
    );

    if (!nowPaymentsCurrency) {
      throw new ValidationError(`Network ${network} not supported for ${wallet.currency}`);
    }

    const fee = WITHDRAWAL_FEES[nowPaymentsCurrency] || 1;
    const minAmount = MIN_WITHDRAWAL[nowPaymentsCurrency] || 10;

    return {
      amount,
      fee,
      totalDeducted: amount + fee,
      minAmount,
      currency: wallet.currency,
      network,
    };
  },

  /**
   * Initiate a crypto withdrawal
   */
  async initiateWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse> {
    const { walletId, userId, amount, address, network } = request;

    // 1. Verify wallet ownership
    const wallet = await prisma.wallets.findFirst({
      where: { id: walletId, user_id: userId },
      include: {
        ledger: { include: { entries: true } },
      },
    });

    if (!wallet) {
      throw new NotFoundError("Wallet not found");
    }

    // 2. Map to NOWPayments currency
    const nowPaymentsCurrency = NowPaymentsService.mapToNowPaymentsCurrency(
      wallet.currency,
      network
    );

    if (!nowPaymentsCurrency) {
      throw new ValidationError(`Network ${network} not supported for ${wallet.currency}`);
    }

    // 3. Validate minimum amount
    const minAmount = MIN_WITHDRAWAL[nowPaymentsCurrency] || 10;
    if (amount < minAmount) {
      throw new ValidationError(`Minimum withdrawal is ${minAmount} ${wallet.currency}`);
    }

    // 4. Calculate fee
    const fee = WITHDRAWAL_FEES[nowPaymentsCurrency] || 1;
    const totalDeducted = amount + fee;

    // 5. Check balance
    const balance = calculateBalance(wallet.ledger);
    if (balance < totalDeducted) {
      throw new InsufficientBalanceError(
        `Insufficient balance. Available: ${balance.toFixed(4)}, Required: ${totalDeducted.toFixed(4)}`
      );
    }

    // 6. Validate address format (basic validation)
    if (!isValidCryptoAddress(address, network)) {
      throw new ValidationError("Invalid withdrawal address format");
    }

    // 7. Generate unique reference
    const reference = `WD-${uuidv4()}`;

    // 8. Create transaction and ledger entries atomically
    const transaction = await prisma.$transaction(async (tx) => {
      // Create pending transaction (store all data in metadata per schema)
      const newTx = await tx.transactions.create({
        data: {
          reference,
          type: "PAYOUT",
          status: "PENDING",
          metadata: {
            userId,
            walletId,
            currency: wallet.currency,
            withdrawalAmount: amount,
            totalAmount: totalDeducted,
            fee,
            address,
            network,
            nowPaymentsCurrency,
            initiatedAt: new Date().toISOString(),
          },
        },
      });

      // Create ledger entries (debit user, credit settlement + fee)
      await LedgerRepo.createLedgerWithdrawalEntries(tx, {
        transactionId: newTx.id,
        walletId,
        amount,
        fee,
      });

      return newTx;
    });

    // 9. Initiate payout via NOWPayments
    // Note: In sandbox/test mode, this may require manual processing
    try {
      const payoutResult = await NowPaymentsService.createPayout({
        address,
        currency: nowPaymentsCurrency,
        amount,
        ipnCallbackUrl: `${process.env.API_URL}/api/webhooks/nowpayments/payout`,
      });

      // Update transaction with payout details
      await prisma.transactions.update({
        where: { id: transaction.id },
        data: {
          metadata: {
            ...(transaction.metadata as object),
            payoutId: payoutResult.id,
            payoutStatus: payoutResult.status,
          },
        },
      });

      logger.info("Withdrawal initiated", {
        reference,
        amount,
        fee,
        address,
        network,
        payoutId: payoutResult.id,
      });
    } catch (error) {
      // Log error but don't fail - transaction is created for manual processing
      logger.error("Failed to initiate NOWPayments payout", {
        error,
        reference,
        transactionId: transaction.id,
      });

      // Update transaction to indicate manual processing needed
      await prisma.transactions.update({
        where: { id: transaction.id },
        data: {
          metadata: {
            ...(transaction.metadata as object),
            requiresManualProcessing: true,
            payoutError: String(error),
          },
        },
      });
    }

    return {
      transactionId: transaction.id,
      reference,
      amount,
      fee,
      totalDeducted,
      address,
      network,
      status: "PENDING",
      estimatedTime: getEstimatedProcessingTime(network),
    };
  },

  /**
   * Get pending withdrawals for a user
   */
  async getPendingWithdrawals(userId: string) {
    // Query transactions where metadata contains this userId
    const withdrawals = await prisma.transactions.findMany({
      where: {
        type: "PAYOUT",
        status: "PENDING",
        metadata: {
          path: ["userId"],
          equals: userId,
        },
      },
      orderBy: { created_at: "desc" },
    });

    return withdrawals.map((tx) => {
      const metadata = tx.metadata as any;
      return {
        id: tx.id,
        reference: tx.reference,
        amount: metadata.withdrawalAmount,
        fee: metadata.fee,
        address: metadata.address,
        network: metadata.network,
        status: tx.status,
        createdAt: tx.created_at,
      };
    });
  },

  /**
   * Cancel a pending withdrawal (admin or user within time window)
   */
  async cancelWithdrawal(transactionId: string, userId: string) {
    const transaction = await prisma.transactions.findFirst({
      where: {
        id: transactionId,
        type: "PAYOUT",
        status: "PENDING",
        metadata: {
          path: ["userId"],
          equals: userId,
        },
      },
    });

    if (!transaction) {
      throw new NotFoundError("Pending withdrawal not found");
    }

    const metadata = transaction.metadata as any;

    // Check if already processing on blockchain
    if (metadata.payoutStatus && metadata.payoutStatus !== "pending_manual") {
      throw new ValidationError("Withdrawal already being processed, cannot cancel");
    }

    const walletId = metadata.walletId;

    // Reverse the withdrawal - use REVERSED status
    await prisma.$transaction(async (tx) => {
      // Update transaction status to REVERSED
      await tx.transactions.update({
        where: { id: transactionId },
        data: {
          status: "REVERSED",
          metadata: {
            ...metadata,
            cancelledAt: new Date().toISOString(),
            cancelledBy: userId,
          },
        },
      });

      // Create reversal ledger entries (credit user, debit settlement + fee)
      const userLedger = await tx.ledger_accounts.findFirst({
        where: { wallet_id: walletId },
      });

      if (!userLedger) {
        throw new Error("Ledger account not found");
      }

      const reversalAmount = metadata.withdrawalAmount + metadata.fee;

      await tx.ledger_entries.createMany({
        data: [
          {
            transaction_id: transactionId,
            ledger_account_id: userLedger.id,
            direction: "CREDIT",
            amount: reversalAmount,
          },
          {
            transaction_id: transactionId,
            ledger_account_id: process.env.SYSTEM_SETTLEMENT_LEDGER_ID!,
            direction: "DEBIT",
            amount: metadata.withdrawalAmount,
          },
          {
            transaction_id: transactionId,
            ledger_account_id: process.env.SYSTEM_FEE_LEDGER_ID!,
            direction: "DEBIT",
            amount: metadata.fee,
          },
        ],
      });
    });

    logger.info("Withdrawal cancelled", {
      transactionId,
      userId,
    });

    return { success: true, message: "Withdrawal cancelled and funds returned" };
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

/**
 * Basic crypto address validation
 */
function isValidCryptoAddress(address: string, network: network_type): boolean {
  // Basic format validation by network
  const patterns: Record<string, RegExp> = {
    TRC20: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,      // TRON addresses
    BEP20: /^0x[a-fA-F0-9]{40}$/,              // BSC (Ethereum-like)
    ERC20: /^0x[a-fA-F0-9]{40}$/,              // Ethereum
    POLYGON: /^0x[a-fA-F0-9]{40}$/,            // Polygon (Ethereum-like)
    BTC: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/, // Bitcoin
  };

  const pattern = patterns[network];
  if (!pattern) return true; // Unknown network, skip validation

  return pattern.test(address);
}

/**
 * Get estimated processing time based on network
 */
function getEstimatedProcessingTime(network: network_type): string {
  const times: Record<string, string> = {
    TRC20: "5-30 minutes",
    BEP20: "5-15 minutes",
    ERC20: "10-60 minutes",
    POLYGON: "5-15 minutes",
    BTC: "30-120 minutes",
  };

  return times[network] || "30-60 minutes";
}

export default CryptoWithdrawalService;
