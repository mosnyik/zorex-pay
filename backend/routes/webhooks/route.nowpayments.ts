import express, { Router } from "express";
import {
  nowpaymentsWebhookHandler,
  nowpaymentsPayoutWebhookHandler,
} from "../../controllers/webhooks/nowpayments.webhook.controller";

const router: Router = express.Router();

/**
 * NOWPayments Webhook Routes
 * These endpoints receive IPN (Instant Payment Notification) callbacks
 *
 * Note: These routes should NOT have authentication middleware
 * since they are called by NOWPayments servers.
 * Security is handled via HMAC signature verification.
 */

// POST /api/webhooks/nowpayments - Payment IPN callback
router.post("/nowpayments", nowpaymentsWebhookHandler);

// POST /api/webhooks/nowpayments/payout - Payout IPN callback
router.post("/nowpayments/payout", nowpaymentsPayoutWebhookHandler);

export default router;
