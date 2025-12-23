interface LedgerAccount {
  wallet_id: String;
  currency: "NGN" | "USDT" | "BTC" | "ETH" | "BNB" | "TRX";
  created_at: Date;
}
