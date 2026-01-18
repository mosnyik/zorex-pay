import type { Request } from "express";
import crypto from "crypto";

export const verifyPaystackSignature = (req: Request): boolean => {
  if (!req) {
    throw new Error("Provide the header");
  }
  const signature = req.headers["x-paystack-signature"] as string;
  if (!signature) return false;

  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(req.body)
    .digest("hex");
  return hash == signature;
//   // TODO: implement
//   return true;
};
