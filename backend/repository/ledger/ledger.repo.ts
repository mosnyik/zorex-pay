import type { Prisma } from "../../generated/prisma/client";

interface FundingLedgerInput {
  transactionId: string;
  walletId: string;
  amount: number;
}

interface WithdrawalLedgerInput {
  transactionId: string;
  walletId: string;
  amount: number;
  fee?: number;
}

interface TransferLedgerInput {
  transactionId: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  fee?: number;
}

export const LedgerRepo = {
  /**
   * Create ledger entries for a funding/deposit
   * CREDIT user wallet, DEBIT system settlement
   */
  createLedgerFundingEntries: async (
    tx: Prisma.TransactionClient,
    input: FundingLedgerInput
  ) => {
    const userLedger = await tx.ledger_accounts.findFirst({
      where: { wallet_id: input.walletId },
    });

    if (!userLedger) {
      throw new Error("Ledger account not found");
    }

    await tx.ledger_entries.createMany({
      data: [
        {
          transaction_id: input.transactionId,
          ledger_account_id: userLedger.id,
          direction: "CREDIT",
          amount: input.amount,
        },
        {
          transaction_id: input.transactionId,
          ledger_account_id: process.env.SYSTEM_SETTLEMENT_LEDGER_ID!,
          direction: "DEBIT",
          amount: input.amount,
        },
      ],
    });
  },

  /**
   * Create ledger entries for a withdrawal/payout
   * DEBIT user wallet, CREDIT system settlement
   * Optionally handles fee (CREDIT fee account)
   */
  createLedgerWithdrawalEntries: async (
    tx: Prisma.TransactionClient,
    input: WithdrawalLedgerInput
  ) => {
    const userLedger = await tx.ledger_accounts.findFirst({
      where: { wallet_id: input.walletId },
    });

    if (!userLedger) {
      throw new Error("Ledger account not found");
    }

    const entries: any[] = [
      {
        transaction_id: input.transactionId,
        ledger_account_id: userLedger.id,
        direction: "DEBIT",
        amount: input.amount + (input.fee || 0),
      },
      {
        transaction_id: input.transactionId,
        ledger_account_id: process.env.SYSTEM_SETTLEMENT_LEDGER_ID!,
        direction: "CREDIT",
        amount: input.amount,
      },
    ];

    // Add fee entry if applicable
    if (input.fee && input.fee > 0) {
      entries.push({
        transaction_id: input.transactionId,
        ledger_account_id: process.env.SYSTEM_FEE_LEDGER_ID!,
        direction: "CREDIT",
        amount: input.fee,
      });
    }

    await tx.ledger_entries.createMany({ data: entries });
  },

  /**
   * Create ledger entries for an internal transfer
   * DEBIT from wallet, CREDIT to wallet
   * Optionally handles fee (CREDIT fee account)
   */
  createLedgerTransferEntries: async (
    tx: Prisma.TransactionClient,
    input: TransferLedgerInput
  ) => {
    const fromLedger = await tx.ledger_accounts.findFirst({
      where: { wallet_id: input.fromWalletId },
    });

    const toLedger = await tx.ledger_accounts.findFirst({
      where: { wallet_id: input.toWalletId },
    });

    if (!fromLedger || !toLedger) {
      throw new Error("Ledger account not found");
    }

    const entries: any[] = [
      {
        transaction_id: input.transactionId,
        ledger_account_id: fromLedger.id,
        direction: "DEBIT",
        amount: input.amount + (input.fee || 0),
      },
      {
        transaction_id: input.transactionId,
        ledger_account_id: toLedger.id,
        direction: "CREDIT",
        amount: input.amount,
      },
    ];

    // Add fee entry if applicable
    if (input.fee && input.fee > 0) {
      entries.push({
        transaction_id: input.transactionId,
        ledger_account_id: process.env.SYSTEM_FEE_LEDGER_ID!,
        direction: "CREDIT",
        amount: input.fee,
      });
    }

    await tx.ledger_entries.createMany({ data: entries });
  },

  /**
   * Get balance for a wallet by summing ledger entries
   */
  getBalance: async (
    tx: Prisma.TransactionClient,
    walletId: string
  ): Promise<number> => {
    const ledger = await tx.ledger_accounts.findFirst({
      where: { wallet_id: walletId },
      include: { entries: true },
    });

    if (!ledger) {
      return 0;
    }

    let balance = 0;
    for (const entry of ledger.entries) {
      const amount = parseFloat(entry.amount?.toString() || "0");
      if (entry.direction === "CREDIT") {
        balance += amount;
      } else {
        balance -= amount;
      }
    }

    return balance;
  },
};
