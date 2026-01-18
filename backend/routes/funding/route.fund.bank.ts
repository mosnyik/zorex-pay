import express, { Router } from "express";
import { fundBankWalletController } from "../../controllers/funding/funding.bank";

const fundBank: Router = express();

fundBank.post("/", fundBankWalletController);

export default fundBank;
