interface paymentAccountPersistenceDto {
  wallet_id: String;
  network: "BANK" | "TRC20" | "BEP20" | "POLYGON" | "ERC20" | "BTC";
  identifier: String;
  provider: String;
  is_active: Boolean;
  created_at: Date;
}
