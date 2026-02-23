import { prisma } from "../../lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { NotFoundError, ValidationError } from "../../errors/domain.errors";
import { NowPaymentsService, CURRENCY_MAP } from "../crypto/nowpayments.service";
import { WalletService } from "../wallet/wallet.service";
import type { network_type, currency_type } from "../../generated/prisma/client";
import logger from "../../logger";

// Map our network types to NOWPayments currency codes
const NETWORK_TO_NOWPAYMENTS: Record<string, Record<string, string>> = {
  USDT: {
    TRC20: "usdttrc20",
    BEP20: "usdtbsc",
    ERC20: "usdterc20",
    POLYGON: "usdtmatic",
  },
  BTC: {
    BTC: "btc",
  },
  ETH: {
    ERC20: "eth",
  },
  BNB: {
    BEP20: "bnb",
  },
  TRX: {
    TRC20: "trx",
  },
};

export interface DepositAddressResponse {
  address: string;
  network: string;
  currency: string;
  walletId: string;
  minimumDeposit: number;
  confirmationsRequired: number;
  isNew: boolean;
  paymentId?: string;
}

export const CryptoFundingService = {
  /**
   * Get or create a deposit address for a crypto wallet
   */
  async getOrCreateDepositAddress(
    walletId: string,
    network: network_type,
    userId: string
  ): Promise<DepositAddressResponse> {
    // Validate network is not BANK
    if (network === "BANK") {
      throw new ValidationError("Use /api/fund-bank for NGN deposits");
    }

    // Get wallet and verify ownership
    const wallet = await prisma.wallets.findFirst({
      where: { id: walletId, user_id: userId },
      include: { accounts: true },
    });

    if (!wallet) {
      throw new NotFoundError("Wallet not found");
    }

    if (wallet.status !== "ACTIVE") {
      throw new ValidationError("Wallet is not active");
    }

    // Validate network for currency
    const validNetworks = WalletService.getValidNetworks(wallet.currency);
    if (!validNetworks.includes(network)) {
      throw new ValidationError(
        `Invalid network ${network} for ${wallet.currency}. Valid: ${validNetworks.join(", ")}`
      );
    }

    // Check for existing active payment account for this network
    const existingAccount = wallet.accounts.find(
      (acc) => acc.network === network && acc.is_active
    );

    if (existingAccount) {
      return {
        address: existingAccount.identifier,
        network: existingAccount.network,
        currency: wallet.currency,
        walletId: wallet.id,
        minimumDeposit: NowPaymentsService.getMinimumDeposit(
          getNowPaymentsCurrency(wallet.currency, network)
        ),
        confirmationsRequired: NowPaymentsService.getRequiredConfirmations(network),
        isNew: false,
      };
    }

    // Generate new deposit address via NOWPayments
    const nowPaymentsCurrency = getNowPaymentsCurrency(wallet.currency, network);
    if (!nowPaymentsCurrency) {
      throw new ValidationError(`Unsupported currency/network combination: ${wallet.currency}/${network}`);
    }

    const orderId = `deposit_${wallet.id}_${uuidv4()}`;

    try {
      // Create payment with NOWPayments to get deposit address
      const payment = await NowPaymentsService.createPayment({
        priceAmount: 0, // Variable amount - user can send any amount
        priceCurrency: "usd",
        payCurrency: nowPaymentsCurrency,
        orderId,
        orderDescription: `Deposit to ${wallet.currency} wallet`,
      });

      // Store the payment account
      await prisma.$transaction(async (tx) => {
        // Create payment account with the deposit address
        await tx.payment_accounts.create({
          data: {
            wallet_id: wallet.id,
            network,
            identifier: payment.pay_address,
            provider: "NOWPAYMENTS",
            is_active: true,
          },
        });

        // Create a PENDING transaction to track this deposit address
        await tx.transactions.create({
          data: {
            type: "FUNDING",
            status: "PENDING",
            reference: orderId,
            metadata: {
              paymentId: payment.payment_id,
              address: payment.pay_address,
              network,
              walletId: wallet.id,
              userId,
              provider: "NOWPAYMENTS",
              payCurrency: nowPaymentsCurrency,
            },
          },
        });
      });

      logger.info("Created crypto deposit address", {
        walletId: wallet.id,
        network,
        address: payment.pay_address,
        paymentId: payment.payment_id,
      });

      return {
        address: payment.pay_address,
        network,
        currency: wallet.currency,
        walletId: wallet.id,
        minimumDeposit: NowPaymentsService.getMinimumDeposit(nowPaymentsCurrency),
        confirmationsRequired: NowPaymentsService.getRequiredConfirmations(network),
        isNew: true,
        paymentId: payment.payment_id,
      };
    } catch (error) {
      logger.error("Failed to create deposit address", {
        error,
        walletId: wallet.id,
        network,
      });
      throw new Error("Failed to generate deposit address. Please try again.");
    }
  },

  /**
   * Get all deposit addresses for a wallet
   */
  async getDepositAddresses(walletId: string, userId: string) {
    const wallet = await prisma.wallets.findFirst({
      where: { id: walletId, user_id: userId },
      include: {
        accounts: {
          where: {
            is_active: true,
            network: { not: "BANK" },
          },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundError("Wallet not found");
    }

    return wallet.accounts.map((acc) => ({
      network: acc.network,
      address: acc.identifier,
      provider: acc.provider,
      createdAt: acc.created_at,
    }));
  },

  /**
   * Get pending deposits for a wallet
   */
  async getPendingDeposits(walletId: string, userId: string) {
    // Verify wallet ownership
    const wallet = await prisma.wallets.findFirst({
      where: { id: walletId, user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundError("Wallet not found");
    }

    const pendingTx = await prisma.transactions.findMany({
      where: {
        type: "FUNDING",
        status: "PENDING",
        metadata: {
          path: ["walletId"],
          equals: walletId,
        },
      },
      orderBy: { created_at: "desc" },
    });

    return pendingTx.map((tx) => {
      const metadata = tx.metadata as any;
      return {
        id: tx.id,
        reference: tx.reference,
        address: metadata?.address,
        network: metadata?.network,
        status: tx.status,
        createdAt: tx.created_at,
      };
    });
  },
};

/**
 * Get NOWPayments currency code from our currency and network
 */
function getNowPaymentsCurrency(currency: string, network: string): string {
  const currencyNetworks = NETWORK_TO_NOWPAYMENTS[currency];
  if (!currencyNetworks) {
    return "";
  }
  return currencyNetworks[network] || "";
}

export default CryptoFundingService;
