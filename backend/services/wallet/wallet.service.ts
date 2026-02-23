import { prisma } from "../../lib/prisma";
import { ConflictError, NotFoundError, ValidationError } from "../../errors/domain.errors";
import type { currency_type, network_type } from "../../generated/prisma/client";

// Valid currency-network combinations
const VALID_CRYPTO_NETWORKS: Record<string, network_type[]> = {
  USDT: ["TRC20", "BEP20", "ERC20", "POLYGON"],
  BTC: ["BTC"],
  ETH: ["ERC20"],
  BNB: ["BEP20"],
  TRX: ["TRC20"],
  NGN: ["BANK"],
};

export interface WalletWithBalance {
  id: string;
  currency: string;
  status: string;
  balance: string;
  createdAt: Date;
}

export interface WalletDetails extends WalletWithBalance {
  paymentAccounts: {
    id: string;
    network: string;
    identifier: string;
    provider: string | null;
    isActive: boolean;
  }[];
}

export const WalletService = {
  /**
   * Get all wallets for a user with calculated balances
   */
  async getUserWallets(userId: string): Promise<WalletWithBalance[]> {
    const wallets = await prisma.wallets.findMany({
      where: { user_id: userId },
      include: {
        ledger: {
          include: {
            entries: true,
          },
        },
      },
      orderBy: { created_at: "asc" },
    });

    return wallets.map((wallet) => ({
      id: wallet.id,
      currency: wallet.currency,
      status: wallet.status,
      balance: calculateBalance(wallet.ledger),
      createdAt: wallet.created_at,
    }));
  },

  /**
   * Get a specific wallet by ID with full details
   */
  async getWalletById(walletId: string, userId: string): Promise<WalletDetails | null> {
    const wallet = await prisma.wallets.findFirst({
      where: { id: walletId, user_id: userId },
      include: {
        accounts: true,
        ledger: {
          include: { entries: true },
        },
      },
    });

    if (!wallet) return null;

    return {
      id: wallet.id,
      currency: wallet.currency,
      status: wallet.status,
      balance: calculateBalance(wallet.ledger),
      createdAt: wallet.created_at,
      paymentAccounts: wallet.accounts.map((acc) => ({
        id: acc.id,
        network: acc.network,
        identifier: acc.identifier,
        provider: acc.provider,
        isActive: acc.is_active,
      })),
    };
  },

  /**
   * Get wallet by currency for a user
   */
  async getWalletByCurrency(userId: string, currency: currency_type): Promise<WalletDetails | null> {
    const wallet = await prisma.wallets.findFirst({
      where: { user_id: userId, currency },
      include: {
        accounts: true,
        ledger: {
          include: { entries: true },
        },
      },
    });

    if (!wallet) return null;

    return {
      id: wallet.id,
      currency: wallet.currency,
      status: wallet.status,
      balance: calculateBalance(wallet.ledger),
      createdAt: wallet.created_at,
      paymentAccounts: wallet.accounts.map((acc) => ({
        id: acc.id,
        network: acc.network,
        identifier: acc.identifier,
        provider: acc.provider,
        isActive: acc.is_active,
      })),
    };
  },

  /**
   * Create a new wallet for a user
   */
  async createWallet(userId: string, currency: currency_type): Promise<WalletWithBalance> {
    // Validate currency
    if (!VALID_CRYPTO_NETWORKS[currency]) {
      throw new ValidationError(`Invalid currency: ${currency}`);
    }

    // Check if wallet already exists
    const existing = await prisma.wallets.findFirst({
      where: { user_id: userId, currency },
    });

    if (existing) {
      throw new ConflictError(`You already have a ${currency} wallet`);
    }

    // Create wallet with ledger account in a transaction
    const wallet = await prisma.$transaction(async (tx) => {
      const newWallet = await tx.wallets.create({
        data: {
          user_id: userId,
          currency,
          status: "ACTIVE",
        },
      });

      // Create ledger account for the wallet
      await tx.ledger_accounts.create({
        data: {
          wallet_id: newWallet.id,
          currency,
        },
      });

      return newWallet;
    });

    return {
      id: wallet.id,
      currency: wallet.currency,
      status: wallet.status,
      balance: "0.00",
      createdAt: wallet.created_at,
    };
  },

  /**
   * Get or create a payment account (deposit address) for a wallet
   */
  async getOrCreatePaymentAccount(
    walletId: string,
    userId: string,
    network: network_type
  ): Promise<{ id: string; network: string; identifier: string; isNew: boolean }> {
    // Verify wallet ownership
    const wallet = await prisma.wallets.findFirst({
      where: { id: walletId, user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundError("Wallet not found");
    }

    // Validate network for currency
    const validNetworks = VALID_CRYPTO_NETWORKS[wallet.currency];
    if (!validNetworks?.includes(network)) {
      throw new ValidationError(
        `Invalid network ${network} for ${wallet.currency}. Valid networks: ${validNetworks?.join(", ")}`
      );
    }

    // Check for existing payment account
    const existing = await prisma.payment_accounts.findFirst({
      where: {
        wallet_id: walletId,
        network,
        is_active: true,
      },
    });

    if (existing) {
      return {
        id: existing.id,
        network: existing.network,
        identifier: existing.identifier,
        isNew: false,
      };
    }

    // For bank accounts (NGN), we don't create here - it's done during registration
    if (network === "BANK") {
      throw new ValidationError("Bank accounts are created automatically during registration");
    }

    // For crypto, we'll create a placeholder - actual address comes from NOWPayments
    // This is handled by the crypto funding service
    throw new NotFoundError("No deposit address found. Use /api/funding/crypto/address to generate one.");
  },

  /**
   * Store a payment account (deposit address)
   */
  async storePaymentAccount(
    walletId: string,
    network: network_type,
    identifier: string,
    provider: string
  ): Promise<{ id: string; network: string; identifier: string }> {
    // Check if already exists
    const existing = await prisma.payment_accounts.findFirst({
      where: {
        wallet_id: walletId,
        network,
        is_active: true,
      },
    });

    if (existing) {
      return {
        id: existing.id,
        network: existing.network,
        identifier: existing.identifier,
      };
    }

    const account = await prisma.payment_accounts.create({
      data: {
        wallet_id: walletId,
        network,
        identifier,
        provider,
        is_active: true,
      },
    });

    return {
      id: account.id,
      network: account.network,
      identifier: account.identifier,
    };
  },

  /**
   * Calculate balance for a wallet
   */
  async getBalance(walletId: string, userId: string): Promise<string> {
    const wallet = await prisma.wallets.findFirst({
      where: { id: walletId, user_id: userId },
      include: {
        ledger: {
          include: { entries: true },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundError("Wallet not found");
    }

    return calculateBalance(wallet.ledger);
  },

  /**
   * Resolve wallet from payment account identifier
   */
  async resolveWalletFromPaymentAccount(identifier: string, network: network_type) {
    const paymentAccount = await prisma.payment_accounts.findFirst({
      where: {
        identifier,
        network,
        is_active: true,
      },
      include: {
        wallets: {
          include: {
            ledger: true,
          },
        },
      },
    });

    if (!paymentAccount) {
      throw new NotFoundError("Payment account not found");
    }

    return paymentAccount.wallets;
  },

  /**
   * Get valid networks for a currency
   */
  getValidNetworks(currency: string): network_type[] {
    return VALID_CRYPTO_NETWORKS[currency] || [];
  },
};

/**
 * Calculate balance from ledger accounts
 * Prisma Decimal is auto-converted to string, so we parse and compute
 */
function calculateBalance(ledgerAccounts: Array<{ entries: Array<{ direction: string; amount: any }> }>): string {
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

  return balance.toFixed(2);
}

export default WalletService;
