import type { Prisma, PrismaClient } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import type { walletPersistenceDto } from "../models/transaction/wallet.model";

type DbClient = Prisma.TransactionClient | PrismaClient;


export const WalletRepo = {
  createWallet: async ( data: walletPersistenceDto, tx?: DbClient,) => {
    const client = tx || prisma;
    // check if user already has a wallet
    const existingWallet = await client.wallets.findFirst({
      where: {
        user_id: data.user_id,
        currency: data.currency,
      },
      select: {
        id: true,
        user_id: true,
        currency: true,
        status: true,
        created_at: true,
      },
    });
    if (existingWallet) {
      throw new Error("User already has a wallet for this currency");
    }

    const wallet = await client.wallets.create({
      data: {
        user_id: data.user_id,
        status: data.status,
        currency: data.currency,
      },
    });
    // generate a payment account for the wallet from paystack
    const paymentAccount = Math.floor(
      1_000_000_000 + Math.random() * 9_000_000_000
    ).toString();

    await client.payment_accounts.create({
      data: {
        wallet_id: wallet.id,
        network: "BANK",
        identifier: paymentAccount,
        provider: "PAYSTACK",
        is_active: true,
      },
    });
  },
  // addFundsFromExternalSource: async (
  //   reference,
  //   metadata,
  //   currency,
  //   user_id,
  //   amount
  // ) => {
  //   await prisma.$transaction(async (tx) => {
  //     // create a transaction for the user
  //     const transaction = await tx.transactions.create({
  //       data: {
  //         type: "FUNDING",
  //         status: "PENDING",
  //         reference,
  //         metadata,
  //       },
  //       select: {
  //         id: true,
  //         type: true,
  //         status: true,
  //         reference: true,
  //         metadata: true,
  //         created_at: true,
  //       },
  //     });

  //     const ledgerAccount = await tx.ledger_accounts.create({
  //       data: {
  //         wallet_id: "wow",
  //         currency: currency,
  //       },
  //       select: {
  //         id: true,
  //         wallet_id: true,
  //         currency: true,
  //         created_at: true,
  //       },
  //     });

  //     // create a ledger entry for recieving user
  //     await tx.ledger_entries.create({
  //       data: {
  //         transaction_id: transaction.id,
  //         ledger_account_id: ledgerAccount.id,
  //         direction: "CREDIT",
  //         amount: amount,
  //       },
  //       select: {
  //         id: true,
  //         transaction_id: true,
  //         ledger_account_id: true,
  //         direction: true,
  //         amount: true,
  //         created_at: true,
  //       },
  //     });

  //     await prisma.$transaction(async (tx) => {
  //       await tx.transactions.update({
  //         where: {
  //           id: transaction.id,
  //         },
  //         data: {
  //           status: "COMPLETED",
  //         },
  //       });
  //     });
  //     // mark transactions as settled/ reversed/canceled based on result
  //   });
  // },
  transferFundsToExternalSource: async () => {
    //
  },
  createInternalTransfer: async () => {},

  createLedgerCreditEntry: async (entry: {
    refrence: string;
    metadata: string;
    currency: "NGN" | "USDT" | "BTC" | "ETH" | "BNB" | "TRX";
    wallet_id: string;
    amount: string;
  }) => {
    await prisma.$transaction(async (tx) => {
      // create a transaction for the user
      const transaction = await tx.transactions.create({
        data: {
          type: "FUNDING",
          status: "PENDING",
          reference: entry.refrence,
          metadata: entry.metadata,
        },
        select: {
          id: true,
          type: true,
          status: true,
          reference: true,
          metadata: true,
          created_at: true,
        },
      });

      const ledgerAccount = await tx.ledger_accounts.create({
        data: {
          wallet_id: entry.wallet_id,
          currency: entry.currency,
        },
        select: {
          id: true,
          wallet_id: true,
          currency: true,
          created_at: true,
        },
      });

      // create a ledger entry for recieving user
      await tx.ledger_entries.create({
        data: {
          transaction_id: transaction.id,
          ledger_account_id: ledgerAccount.id,
          direction: "CREDIT",
          amount: entry.amount,
        },
        select: {
          id: true,
          transaction_id: true,
          ledger_account_id: true,
          direction: true,
          amount: true,
          created_at: true,
        },
      });
    });
  },

  createLegerDebitEntry: async () => {},
};
