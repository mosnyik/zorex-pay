import type { walletPersistenceDto } from "../models/transaction/wallet.model";
import { WalletRepo } from "../repository/wallet.repo";

const createWallet = async (wallet_data: walletPersistenceDto) => {
  await WalletRepo.createWallet(wallet_data);
};

const addFund = async ( ) =>{

}
const addFundWalletFromExternalSource = async () => {
  // initiate transfer from external source

  // await comfirmation from the source
  // create a ledger credit entry for the user
  
  // mark entry are settled
};
const transferInternal = async () => {
  // check the balance of the tranfering user
  // create a debit ledger entry for the transfering user
  // create a credit legder entry for the recieving user
};

const withdrewToExternalSource = async () => {
  // create pending debit
  // initiate payout
  // on success mark as settled
  // on failure mark as reversed or canceled
};

const WalletService = {
  createWallet,
  addFundWalletFromExternalSource,
  transferInternal,
  withdrewToExternalSource,
};

export default WalletService;
