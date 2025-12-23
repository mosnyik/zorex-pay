interface LedgerEntryPersistencDto {
  transaction_id: String;
  ledger_account_id: String;
  direction: "DEBIT" | "CREDIT";
  amount: Number;
  created_at: Date;
}
