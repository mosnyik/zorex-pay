

export interface transactionPersistenceDto {
  type: "FUNDING" | "PAYOUT" | "TRANSFER" | "PAYMENT";
  status: "ACTIVE" | "FROZEN";
  reference: String;
  metadata: String;
  created_at: Date;
}

interface Rate {
  currency_from: String;
  currency_to: String;
  current_rate: Number;
  merchant_rate: Number;
  profit_rate: Number;
  currentRate_used: Number;
  merchant_rate_used: Number;
  profit_rate_used: Number;
  updated_at: Date;
}
