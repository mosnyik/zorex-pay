import type { Request, Response } from "express";
import { verifyPaystackSignature } from "../../utils/verifyPaystackSignature";
import { handlePaystackWebhook } from "../../services/webhooks/service.paystack";
import { handleHttpError } from "../error.handler";

export const paystackWebhookController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!verifyPaystackSignature(req)) {
      res.status(401).end();
    }

    await handlePaystackWebhook(req.body);

    return res.status(200).json({ recieved: true });
  } catch (err) {
    handleHttpError(err, res);
  }
};
