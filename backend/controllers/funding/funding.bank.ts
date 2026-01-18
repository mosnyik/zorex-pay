import type { Request, Response } from "express";
import { handleHttpError } from "../error.handler";
import { initializeWalletFunding } from "../../services/funding/fund.bank.paystack";

export const fundBankWalletController = async (req: Request, res: Response) => {
  try {
    const { walletId, amount } = req.body;

    const result = await initializeWalletFunding({
      walletId,
      amount,
    });

    return res.status(200).json(result);
  } catch (err) {
    handleHttpError(err, res);
  }
};
