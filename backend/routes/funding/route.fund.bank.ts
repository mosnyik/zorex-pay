import express, { Router } from "express";
import { fundBankWalletController } from "../../controllers/funding/funding.bank";
import { requireAuth } from "../../middleware/request-auth";

const fundBank: Router = express.Router();

fundBank.post("/", requireAuth, fundBankWalletController);

export default fundBank;
