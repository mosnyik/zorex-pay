import type { Request, Response } from "express";
import { NowPaymentsWebhookService, NowPaymentsPayoutIPNPayload } from "../../services/webhooks/nowpayments.webhook.service";
import logger from "../../logger";

/**
 * POST /api/webhooks/nowpayments
 * Handle NOWPayments IPN (Instant Payment Notification) callbacks
 *
 * NOWPayments sends webhooks when:
 * - Payment is waiting for funds
 * - Payment is confirming (blockchain confirmations)
 * - Payment is confirmed
 * - Payment is finished (fully settled)
 * - Payment has failed/expired/refunded
 */
export async function nowpaymentsWebhookHandler(req: Request, res: Response) {
  try {
    // Get signature from header
    const signature = req.headers["x-nowpayments-sig"] as string;

    if (!signature) {
      logger.warn("NOWPayments webhook missing signature header");
      return res.status(401).json({ error: "Missing signature" });
    }

    // Get raw body for signature verification
    // Note: This requires raw body middleware to be set up
    const rawBody = typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body);

    const payload = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    // Acknowledge receipt immediately to prevent timeout
    // NOWPayments expects 200 response within 20 seconds
    res.status(200).json({ received: true });

    // Process webhook asynchronously
    const result = await NowPaymentsWebhookService.handleIPN(
      payload,
      signature,
      rawBody
    );

    logger.info("NOWPayments webhook processed", {
      orderId: payload.order_id,
      paymentStatus: payload.payment_status,
      result,
    });
  } catch (error) {
    logger.error("NOWPayments webhook error", { error });

    // Still return 200 to prevent NOWPayments from retrying
    // We log the error and can investigate manually
    if (!res.headersSent) {
      return res.status(200).json({ received: true, error: "Processing error" });
    }
  }
}

/**
 * POST /api/webhooks/nowpayments/payout
 * Handle NOWPayments payout IPN callbacks
 *
 * This is called when a payout (withdrawal) status changes
 */
export async function nowpaymentsPayoutWebhookHandler(req: Request, res: Response) {
  try {
    const signature = req.headers["x-nowpayments-sig"] as string;

    if (!signature) {
      logger.warn("NOWPayments payout webhook missing signature");
      return res.status(401).json({ error: "Missing signature" });
    }

    const rawBody = typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body);

    const payload: NowPaymentsPayoutIPNPayload = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    logger.info("NOWPayments payout webhook received", {
      payoutId: payload.id,
      status: payload.status,
    });

    // Acknowledge receipt immediately
    res.status(200).json({ received: true });

    // Process payout webhook asynchronously
    const result = await NowPaymentsWebhookService.handlePayoutIPN(
      payload,
      signature,
      rawBody
    );

    logger.info("NOWPayments payout webhook processed", {
      payoutId: payload.id,
      status: payload.status,
      result,
    });
  } catch (error) {
    logger.error("NOWPayments payout webhook error", { error });

    if (!res.headersSent) {
      return res.status(200).json({ received: true, error: "Processing error" });
    }
  }
}
