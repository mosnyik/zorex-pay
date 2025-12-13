-- CreateTable
CREATE TABLE "rates" (
    "id" TEXT NOT NULL,
    "currency_from" VARCHAR(20) NOT NULL,
    "currency_to" VARCHAR(20) NOT NULL,
    "current_rate" DECIMAL(18,4) NOT NULL,
    "merchant_rate" DECIMAL(18,4) NOT NULL,
    "profit_rate" DECIMAL(18,4),
    "current_rate_used" DECIMAL(18,4),
    "merchant_rate_used" DECIMAL(18,4),
    "profit_rate_used" DECIMAL(18,4),
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "previous_balance" DECIMAL(18,2) NOT NULL,
    "new_balance" DECIMAL(18,2) NOT NULL,
    "reference" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "kyc_status" VARCHAR(50) NOT NULL DEFAULT 'unverified',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "currency" VARCHAR(20) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE INDEX "idx_tx_reference" ON "transactions"("reference");

-- CreateIndex
CREATE INDEX "idx_tx_status" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "idx_tx_type" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "idx_tx_wallet" ON "transactions"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_wallet_currency" ON "wallets"("currency");

-- CreateIndex
CREATE INDEX "idx_wallet_user" ON "wallets"("user_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
