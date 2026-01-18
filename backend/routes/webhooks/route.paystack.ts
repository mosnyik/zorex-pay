import express, { Router } from "express";
import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { paystackWebhookController } from "../../controllers/webhooks/paystack.controller";

const paystack: Router = express();

paystack.post(
  "/paystack",
  express.raw({ type: "application/json" }),
  paystackWebhookController
);

export default paystack;
