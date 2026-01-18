import type { Prisma } from "../../generated/prisma/client";

interface FundingLedgerInput {
  transactionId: string;
  walletId: string;
  amount: number;
}

export const LedgerRepo = {
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
};
