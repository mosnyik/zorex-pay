import { prisma } from "../../lib/prisma";
import { LedgerRepo } from "../../repository/ledger/ledger.repo";
import { WalletRepo } from "../../repository/wallet.repo";

export const handlePaystackWebhook = async (rawBody: Buffer) => {
  const payload = JSON.parse(rawBody.toString());

  if (payload.event !== "charge.success") {
    return;
  }

  const reference = payload.data.reference;
  const amount = payload.data.amount / 100;
  const accountNumber = payload.data.authorization?.account_number;

  if (!reference || !accountNumber) {
    throw new Error("Invalid webhook payload");
  }

  const existingTrx = await prisma.transactions.findUnique({
    where: { reference },
  });

  if (existingTrx?.status == "COMPLETED") {
    return;
  }

  const wallet = await WalletRepo.resolveWalletFromBankAccount(
    accountNumber,
    "BANK"
  );

  // update transaction
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transactions.upsert({
      where: { reference },
      update: {
        status: "COMPLETED",
        metadata: payload,
      },
      create: {
        reference,
        type: "FUNDING",
        status: "COMPLETED",
        metadata: payload,
      },
    });
    await LedgerRepo.createLedgerFundingEntries(tx, {
      transactionId: transaction.id,
      walletId: wallet.id,
      amount,
    });
  });
};
