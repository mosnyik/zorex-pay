import NowPaymentsApi from "@nowpaymentsio/nowpayments-api-js";
import crypto from "crypto";
import config from "config";
import logger from "../../logger";

// Initialize NOWPayments API client
const apiKey = config.get<string>("nowpayments.apiKey") || process.env.NOWPAYMENTS_API_KEY;
const ipnSecret = config.get<string>("nowpayments.ipnSecret") || process.env.NOWPAYMENTS_IPN_SECRET;

const api = new NowPaymentsApi({ apiKey: apiKey! });

// Currency mapping: our internal currency -> NOWPayments currency code
export const CURRENCY_MAP: Record<string, string> = {
  USDT_TRC20: "usdttrc20",
  USDT_BEP20: "usdtbsc",
  USDT_ERC20: "usdterc20",
  USDT_POLYGON: "usdtmatic",
  BTC: "btc",
  ETH: "eth",
  BNB: "bnb",
  TRX: "trx",
};

// Reverse mapping for webhook processing
export const REVERSE_CURRENCY_MAP: Record<string, { currency: string; network: string }> = {
  usdttrc20: { currency: "USDT", network: "TRC20" },
  usdtbsc: { currency: "USDT", network: "BEP20" },
  usdterc20: { currency: "USDT", network: "ERC20" },
  usdtmatic: { currency: "USDT", network: "POLYGON" },
  btc: { currency: "BTC", network: "BTC" },
  eth: { currency: "ETH", network: "ERC20" },
  bnb: { currency: "BNB", network: "BEP20" },
  trx: { currency: "TRX", network: "TRC20" },
};

// Minimum deposit amounts (in crypto units)
export const MIN_DEPOSIT: Record<string, number> = {
  usdttrc20: 10,
  usdtbsc: 10,
  usdterc20: 50, // Higher due to gas fees
  usdtmatic: 10,
  btc: 0.0001,
  eth: 0.01,
  bnb: 0.05,
  trx: 50,
};

// Network confirmations required
export const CONFIRMATIONS_REQUIRED: Record<string, number> = {
  TRC20: 20,
  BEP20: 15,
  ERC20: 12,
  POLYGON: 128,
  BTC: 2,
};

export interface CreatePaymentParams {
  priceAmount: number;
  priceCurrency: string;
  payCurrency: string;
  orderId: string;
  orderDescription?: string;
  ipnCallbackUrl?: string;
}

export interface PaymentResponse {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  created_at: string;
  updated_at: string;
  purchase_id: string;
}

export interface PaymentStatusResponse {
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
}

export interface PayoutParams {
  address: string;
  currency: string;
  amount: number;
  ipnCallbackUrl?: string;
}

export const NowPaymentsService = {
  /**
   * Get available currencies from NOWPayments
   */
  async getAvailableCurrencies(): Promise<string[]> {
    try {
      const response = await api.getCurrencies() as any;
      if (response instanceof Error) {
        throw response;
      }
      return response.currencies || [];
    } catch (error) {
      logger.error("Failed to get currencies from NOWPayments", { error });
      throw error;
    }
  },

  /**
   * Get API status to verify connectivity
   */
  async getStatus(): Promise<{ message: string }> {
    try {
      const response = await api.status() as any;
      if (response instanceof Error) {
        throw response;
      }
      return { message: response.message || "OK" };
    } catch (error) {
      logger.error("Failed to get NOWPayments status", { error });
      throw error;
    }
  },

  /**
   * Get minimum payment amount for a currency
   */
  async getMinimumAmount(currencyFrom: string, currencyTo: string): Promise<number> {
    try {
      const response = await api.getMinimumPaymentAmount({
        currency_from: currencyFrom,
        currency_to: currencyTo,
      }) as any;
      if (response instanceof Error) {
        throw response;
      }
      return response.min_amount;
    } catch (error) {
      logger.error("Failed to get minimum amount", { error, currencyFrom, currencyTo });
      throw error;
    }
  },

  /**
   * Get estimated price for conversion
   */
  async getEstimatedPrice(amount: number, currencyFrom: string, currencyTo: string): Promise<number> {
    try {
      const response = await api.getEstimatePrice({
        amount,
        currency_from: currencyFrom,
        currency_to: currencyTo,
      }) as any;
      if (response instanceof Error) {
        throw response;
      }
      return response.estimated_amount;
    } catch (error) {
      logger.error("Failed to get estimated price", { error });
      throw error;
    }
  },

  /**
   * Create a payment (for deposits)
   * Returns a unique address for the user to send crypto to
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    const apiUrl = config.get<string>("api.url") || process.env.API_URL;

    try {
      const response = await api.createPayment({
        price_amount: params.priceAmount,
        price_currency: params.priceCurrency,
        pay_currency: params.payCurrency,
        order_id: params.orderId,
        order_description: params.orderDescription || `Deposit ${params.orderId}`,
        ipn_callback_url: params.ipnCallbackUrl || `${apiUrl}/api/webhooks/nowpayments`,
      }) as any;

      if (response instanceof Error) {
        throw response;
      }

      logger.info("Created NOWPayments payment", {
        paymentId: response.payment_id,
        orderId: params.orderId,
        address: response.pay_address,
      });

      return response as PaymentResponse;
    } catch (error) {
      logger.error("Failed to create NOWPayments payment", { error, params });
      throw error;
    }
  },

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await api.getPaymentStatus({ payment_id: paymentId }) as any;
      if (response instanceof Error) {
        throw response;
      }
      return response as PaymentStatusResponse;
    } catch (error) {
      logger.error("Failed to get payment status", { error, paymentId });
      throw error;
    }
  },

  /**
   * Create a payout (for withdrawals)
   * Note: Payouts require Mass Payments API which needs business verification
   * For now, this will use manual withdrawal processing
   */
  async createPayout(params: PayoutParams): Promise<any> {
    // NOWPayments Mass Payouts requires separate API access
    // This is a placeholder that logs the payout request
    // In production, integrate with NOWPayments Mass Payments API
    logger.info("Payout request created (requires manual processing)", {
      address: params.address,
      currency: params.currency,
      amount: params.amount,
    });

    // Return a mock response structure
    // Real implementation would call the Mass Payments API
    return {
      id: `payout_${Date.now()}`,
      address: params.address,
      currency: params.currency,
      amount: params.amount,
      status: "pending_manual",
    };
  },

  /**
   * Verify IPN webhook signature
   * NOWPayments sends HMAC-SHA512 signature in x-nowpayments-sig header
   */
  verifyIPNSignature(payload: string | object, signature: string): boolean {
    if (!ipnSecret) {
      logger.warn("NOWPayments IPN secret not configured");
      return false;
    }

    try {
      // Sort payload keys alphabetically (NOWPayments requirement)
      const sortedPayload = typeof payload === "string"
        ? payload
        : JSON.stringify(sortObjectKeys(payload));

      const expectedSignature = crypto
        .createHmac("sha512", ipnSecret)
        .update(sortedPayload)
        .digest("hex");

      // Use timing-safe comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        logger.warn("Invalid NOWPayments IPN signature");
      }

      return isValid;
    } catch (error) {
      logger.error("Error verifying NOWPayments signature", { error });
      return false;
    }
  },

  /**
   * Map our internal currency+network to NOWPayments currency code
   */
  mapToNowPaymentsCurrency(currency: string, network: string): string | null {
    const key = `${currency}_${network}`;
    return CURRENCY_MAP[key] || CURRENCY_MAP[currency] || null;
  },

  /**
   * Map NOWPayments currency code to our internal currency+network
   */
  mapFromNowPaymentsCurrency(nowPaymentsCurrency: string): { currency: string; network: string } | null {
    return REVERSE_CURRENCY_MAP[nowPaymentsCurrency.toLowerCase()] || null;
  },

  /**
   * Get minimum deposit amount for a currency
   */
  getMinimumDeposit(nowPaymentsCurrency: string): number {
    return MIN_DEPOSIT[nowPaymentsCurrency.toLowerCase()] || 10;
  },

  /**
   * Get required confirmations for a network
   */
  getRequiredConfirmations(network: string): number {
    return CONFIRMATIONS_REQUIRED[network] || 12;
  },
};

/**
 * Helper function to sort object keys alphabetically (deep)
 */
function sortObjectKeys(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  return Object.keys(obj)
    .sort()
    .reduce((result: any, key) => {
      result[key] = sortObjectKeys(obj[key]);
      return result;
    }, {});
}

export default NowPaymentsService;
