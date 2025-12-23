export interface walletPersistenceDto {
  user_id: string;
  currency: "NGN" | "USDT" | "BTC" | "ETH" | "BNB" | "TRX";
  status: "ACTIVE" | "FROZEN";
  created_at: Date;
}
