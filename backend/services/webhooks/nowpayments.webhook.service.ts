import { prisma } from "../../lib/prisma";
import { LedgerRepo } from "../../repository/ledger/ledger.repo";
import { NowPaymentsService, REVERSE_CURRENCY_MAP } from "../crypto/nowpayments.service";
import logger from "../../logger";

/**
 * NOWPayments IPN Payload structure
 * https://documenter.getpostman.com/view/7907941/S1a32n38#ipn-callback
 */
export interface NowPaymentsIPNPayload {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  outcome_amount: number;
  outcome_currency: string;
  created_at: string;
  updated_at: string;
}

/**
 * Valid payment statuses from NOWPayments
 */
const PAYMENT_STATUSES = {
  WAITING: "waiting",
  CONFIRMING: "confirming",
  CONFIRMED: "confirmed",
  SENDING: "sending",
  PARTIALLY_PAID: "partially_paid",
  FINISHED: "finished",
  FAILED: "failed",
  REFUNDED: "refunded",
  EXPIRED: "expired",
};

/**
 * Statuses that indicate successful payment
 */
const SUCCESS_STATUSES = [PAYMENT_STATUSES.CONFIRMED, PAYMENT_STATUSES.FINISHED];

/**
 * Statuses that indicate failed payment
 */
const FAILED_STATUSES = [PAYMENT_STATUSES.FAILED, PAYMENT_STATUSES.REFUNDED, PAYMENT_STATUSES.EXPIRED];

export interface WebhookResult {
  processed: boolean;
  status: string;
  message: string;
  transactionId?: string;
}

/**
 * Payout IPN Payload structure
 */
export interface NowPaymentsPayoutIPNPayload {
  id: string;
  status: string;
  address: string;
  currency: string;
  amount: number;
  hash?: string;
  created_at: string;
  updated_at: string;
  extra_id?: string;
}

/**
 * Payout statuses
 */
const PAYOUT_STATUSES = {
  CREATED: "CREATED",
  PROCESSING: "PROCESSING",
  FINISHED: "FINISHED",
  FAILED: "FAILED",
  REJECTED: "REJECTED",
};

export const NowPaymentsWebhookService = {
  /**
   * Handle IPN callback from NOWPayments (deposits)
   */
  async handleIPN(
    payload: NowPaymentsIPNPayload,
    signature: string,
    rawBody: string
  ): Promise<WebhookResult> {
    const { payment_id, payment_status, order_id, pay_address, actually_paid, outcome_amount } = payload;

    logger.info("Received NOWPayments IPN", {
      paymentId: payment_id,
      status: payment_status,
      orderId: order_id,
      address: pay_address,
    });

    // 1. Verify signature
    if (!NowPaymentsService.verifyIPNSignature(rawBody, signature)) {
      logger.warn("Invalid NOWPayments IPN signature", { paymentId: payment_id });
      return {
        processed: false,
        status: "error",
        message: "Invalid signature",
      };
    }

    // 2. Find the transaction by order_id (reference)
    const existingTx = await prisma.transactions.findUnique({
      where: { reference: order_id },
    });

    if (!existingTx) {
      logger.warn("Transaction not found for NOWPayments IPN", { orderId: order_id });
      return {
        processed: false,
        status: "error",
        message: "Transaction not found",
      };
    }

    // 3. Check if already processed (idempotency)
    if (existingTx.status === "COMPLETED") {
      logger.info("Transaction already completed, skipping", { orderId: order_id });
      return {
        processed: true,
        status: "skipped",
        message: "Already processed",
        transactionId: existingTx.id,
      };
    }

    // 4. Handle based on payment status
    if (SUCCESS_STATUSES.includes(payment_status)) {
      return await processSuccessfulPayment(existingTx, payload);
    }

    if (FAILED_STATUSES.includes(payment_status)) {
      return await processFailedPayment(existingTx, payload);
    }

    // For other statuses (waiting, confirming, etc.), just update metadata
    await prisma.transactions.update({
      where: { id: existingTx.id },
      data: {
        metadata: {
          ...(existingTx.metadata as object),
          lastWebhookStatus: payment_status,
          lastWebhookAt: new Date().toISOString(),
          actuallyPaid: actually_paid,
        },
      },
    });

    logger.info("NOWPayments IPN - status update only", {
      paymentId: payment_id,
      status: payment_status,
      orderId: order_id,
    });

    return {
      processed: true,
      status: "pending",
      message: `Payment status: ${payment_status}`,
      transactionId: existingTx.id,
    };
  },

  /**
   * Handle payout IPN callback from NOWPayments (withdrawals)
   */
  async handlePayoutIPN(
    payload: NowPaymentsPayoutIPNPayload,
    signature: string,
    rawBody: string
  ): Promise<WebhookResult> {
    const { id, status, address, amount, hash } = payload;

    logger.info("Received NOWPayments Payout IPN", {
      payoutId: id,
      status,
      address,
      amount,
    });

    // 1. Verify signature
    if (!NowPaymentsService.verifyIPNSignature(rawBody, signature)) {
      logger.warn("Invalid NOWPayments Payout IPN signature", { payoutId: id });
      return {
        processed: false,
        status: "error",
        message: "Invalid signature",
      };
    }

    // 2. Find the transaction by payout ID in metadata
    const existingTx = await prisma.transactions.findFirst({
      where: {
        type: "PAYOUT",
        metadata: {
          path: ["payoutId"],
          equals: id,
        },
      },
    });

    if (!existingTx) {
      logger.warn("Transaction not found for NOWPayments Payout IPN", { payoutId: id });
      return {
        processed: false,
        status: "error",
        message: "Transaction not found",
      };
    }

    // 3. Check if already completed (idempotency)
    if (existingTx.status === "COMPLETED") {
      logger.info("Payout already completed, skipping", { payoutId: id });
      return {
        processed: true,
        status: "skipped",
        message: "Already processed",
        transactionId: existingTx.id,
      };
    }

    const metadata = existingTx.metadata as any;

    // 4. Handle based on payout status
    if (status === PAYOUT_STATUSES.FINISHED) {
      await prisma.transactions.update({
        where: { id: existingTx.id },
        data: {
          status: "COMPLETED",
          metadata: {
            ...metadata,
            completedAt: new Date().toISOString(),
            txHash: hash,
            finalStatus: status,
          },
        },
      });

      logger.info("Payout completed", {
        payoutId: id,
        transactionId: existingTx.id,
        hash,
      });

      return {
        processed: true,
        status: "completed",
        message: "Payout completed successfully",
        transactionId: existingTx.id,
      };
    }

    if (status === PAYOUT_STATUSES.FAILED || status === PAYOUT_STATUSES.REJECTED) {
      // Payout failed - need to refund the user
      await processFailedPayout(existingTx, payload);

      return {
        processed: true,
        status: "failed",
        message: `Payout ${status.toLowerCase()}`,
        transactionId: existingTx.id,
      };
    }

    // Processing status - keep as PENDING but update metadata with processing info
    await prisma.transactions.update({
      where: { id: existingTx.id },
      data: {
        metadata: {
          ...metadata,
          isProcessing: true,
          lastWebhookStatus: status,
          lastWebhookAt: new Date().toISOString(),
        },
      },
    });

    return {
      processed: true,
      status: "processing",
      message: `Payout status: ${status}`,
      transactionId: existingTx.id,
    };
  },
};

/**
 * Process a successful crypto payment
 */
async function processSuccessfulPayment(
  existingTx: any,
  payload: NowPaymentsIPNPayload
): Promise<WebhookResult> {
  const { payment_id, order_id, actually_paid, outcome_amount, pay_currency } = payload;

  // Get wallet from transaction metadata
  const metadata = existingTx.metadata as any;
  const walletId = metadata?.walletId;

  if (!walletId) {
    logger.error("No walletId in transaction metadata", { orderId: order_id });
    return {
      processed: false,
      status: "error",
      message: "Missing wallet ID in transaction",
    };
  }

  // Use the actual amount received (outcome_amount or actually_paid)
  const amount = outcome_amount || actually_paid;

  if (!amount || amount <= 0) {
    logger.error("Invalid payment amount", { orderId: order_id, amount });
    return {
      processed: false,
      status: "error",
      message: "Invalid payment amount",
    };
  }

  try {
    // Update transaction and create ledger entries atomically
    await prisma.$transaction(async (tx) => {
      // Update transaction status
      await tx.transactions.update({
        where: { id: existingTx.id },
        data: {
          status: "COMPLETED",
          metadata: {
            ...metadata,
            completedAt: new Date().toISOString(),
            paymentId: payment_id,
            actuallyPaid: actually_paid,
            outcomeAmount: outcome_amount,
            payCurrency: pay_currency,
          },
        },
      });

      // Create double-entry ledger entries
      await LedgerRepo.createLedgerFundingEntries(tx, {
        transactionId: existingTx.id,
        walletId,
        amount,
      });
    });

    logger.info("Crypto deposit completed", {
      orderId: order_id,
      walletId,
      amount,
      currency: pay_currency,
    });

    return {
      processed: true,
      status: "completed",
      message: "Payment processed successfully",
      transactionId: existingTx.id,
    };
  } catch (error) {
    logger.error("Failed to process crypto deposit", {
      error,
      orderId: order_id,
      walletId,
    });
    return {
      processed: false,
      status: "error",
      message: "Failed to process payment",
    };
  }
}

/**
 * Process a failed crypto payment
 */
async function processFailedPayment(
  existingTx: any,
  payload: NowPaymentsIPNPayload
): Promise<WebhookResult> {
  const { payment_id, payment_status, order_id } = payload;

  const metadata = existingTx.metadata as any;

  await prisma.transactions.update({
    where: { id: existingTx.id },
    data: {
      status: "FAILED",
      metadata: {
        ...metadata,
        failedAt: new Date().toISOString(),
        failureReason: payment_status,
        paymentId: payment_id,
      },
    },
  });

  logger.info("Crypto deposit failed", {
    orderId: order_id,
    status: payment_status,
  });

  return {
    processed: true,
    status: "failed",
    message: `Payment ${payment_status}`,
    transactionId: existingTx.id,
  };
}

/**
 * Process a failed payout - refund the user
 */
async function processFailedPayout(
  existingTx: any,
  payload: NowPaymentsPayoutIPNPayload
): Promise<void> {
  const { id, status } = payload;
  const metadata = existingTx.metadata as any;

  await prisma.$transaction(async (tx) => {
    // Update transaction status
    await tx.transactions.update({
      where: { id: existingTx.id },
      data: {
        status: "FAILED",
        metadata: {
          ...metadata,
          failedAt: new Date().toISOString(),
          failureReason: status,
          refunded: true,
        },
      },
    });

    // Refund the user by creating reversal ledger entries
    const userLedger = await tx.ledger_accounts.findFirst({
      where: { wallet_id: existingTx.wallet_id },
    });

    if (!userLedger) {
      throw new Error("User ledger not found for refund");
    }

    const refundAmount = metadata.withdrawalAmount + metadata.fee;

    // Credit user (refund), debit settlement + fee accounts
    await tx.ledger_entries.createMany({
      data: [
        {
          transaction_id: existingTx.id,
          ledger_account_id: userLedger.id,
          direction: "CREDIT",
          amount: refundAmount,
        },
        {
          transaction_id: existingTx.id,
          ledger_account_id: process.env.SYSTEM_SETTLEMENT_LEDGER_ID!,
          direction: "DEBIT",
          amount: metadata.withdrawalAmount,
        },
        {
          transaction_id: existingTx.id,
          ledger_account_id: process.env.SYSTEM_FEE_LEDGER_ID!,
          direction: "DEBIT",
          amount: metadata.fee,
        },
      ],
    });

    logger.info("Payout failed - user refunded", {
      payoutId: id,
      transactionId: existingTx.id,
      refundAmount,
    });
  });
}

export default NowPaymentsWebhookService;
