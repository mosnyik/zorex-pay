import { prisma } from "../lib/prisma";
import type { walletPersistenceDto } from "../models/transaction/wallet.model";

export const WalletRepo = {
  createWallet: async (data: walletPersistenceDto) => {
    await prisma.wallets.create({
      data: {
        user_id: data.user_id,
        status: data.status,
        currency: data.currency,
      },
    });
  },
};
