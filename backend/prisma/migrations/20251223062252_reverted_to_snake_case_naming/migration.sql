/*
  Warnings:

  - You are about to drop the column `currencyFrom` on the `Rate` table. All the data in the column will be lost.
  - You are about to drop the column `currencyTo` on the `Rate` table. All the data in the column will be lost.
  - You are about to drop the column `currentRate` on the `Rate` table. All the data in the column will be lost.
  - You are about to drop the column `currentRateUsed` on the `Rate` table. All the data in the column will be lost.
  - You are about to drop the column `merchantRate` on the `Rate` table. All the data in the column will be lost.
  - You are about to drop the column `merchantRateUsed` on the `Rate` table. All the data in the column will be lost.
  - You are about to drop the column `profitRate` on the `Rate` table. All the data in the column will be lost.
  - You are about to drop the column `profitRateUsed` on the `Rate` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Rate` table. All the data in the column will be lost.
  - You are about to drop the `LedgerAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LedgerEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RefreshToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Transaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Wallet` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `currency_from` to the `Rate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency_to` to the `Rate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `current_rate` to the `Rate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `merchant_rate` to the `Rate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Rate` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "currency_type" AS ENUM ('NGN', 'USDT', 'BTC', 'ETH', 'BNB', 'TRX');

-- CreateEnum
CREATE TYPE "network_type" AS ENUM ('BANK', 'TRC20', 'BEP20', 'POLYGON', 'ERC20', 'BTC');

-- CreateEnum
CREATE TYPE "wallet_status" AS ENUM ('ACTIVE', 'FROZEN');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('FUNDING', 'PAYOUT', 'TRANSFER', 'PAYMENT');

-- CreateEnum
CREATE TYPE "transaction_staus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ledger_direction" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "ledger_account_type" AS ENUM ('USER', 'SYSTEM', 'FEE', 'SETTLEMENT');

-- CreateEnum
CREATE TYPE "kyc_status" AS ENUM ('UNVERFIED', 'PENDING', 'VERIFIED');

-- DropForeignKey
ALTER TABLE "LedgerAccount" DROP CONSTRAINT "LedgerAccount_walletId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_ledgerAccountId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentAccount" DROP CONSTRAINT "PaymentAccount_walletId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_userId_fkey";

-- AlterTable
ALTER TABLE "Rate" DROP COLUMN "currencyFrom",
DROP COLUMN "currencyTo",
DROP COLUMN "currentRate",
DROP COLUMN "currentRateUsed",
DROP COLUMN "merchantRate",
DROP COLUMN "merchantRateUsed",
DROP COLUMN "profitRate",
DROP COLUMN "profitRateUsed",
DROP COLUMN "updatedAt",
ADD COLUMN     "currency_from" VARCHAR(20) NOT NULL,
ADD COLUMN     "currency_to" VARCHAR(20) NOT NULL,
ADD COLUMN     "current_rate" DECIMAL(18,7) NOT NULL,
ADD COLUMN     "current_rate_used" DECIMAL(18,7),
ADD COLUMN     "merchant_rate" DECIMAL(18,7) NOT NULL,
ADD COLUMN     "merchant_rate_used" DECIMAL(18,7),
ADD COLUMN     "profit_rate" DECIMAL(18,7),
ADD COLUMN     "profit_rate_used" DECIMAL(18,7),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "LedgerAccount";

-- DropTable
DROP TABLE "LedgerEntry";

-- DropTable
DROP TABLE "PaymentAccount";

-- DropTable
DROP TABLE "RefreshToken";

-- DropTable
DROP TABLE "Transaction";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Wallet";

-- DropEnum
DROP TYPE "CurrencyType";

-- DropEnum
DROP TYPE "KYCSTatus";

-- DropEnum
DROP TYPE "LedgerAccountType";

-- DropEnum
DROP TYPE "LedgerDirection";

-- DropEnum
DROP TYPE "NetworkType";

-- DropEnum
DROP TYPE "TransactionStaus";

-- DropEnum
DROP TYPE "TransactionType";

-- DropEnum
DROP TYPE "WalletStatus";

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "replaced_by_token" VARCHAR(255),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "user_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "kyc_status" "kyc_status" NOT NULL DEFAULT 'UNVERFIED',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "currency" "currency_type" NOT NULL,
    "status" "wallet_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_accounts" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "network" "network_type" NOT NULL,
    "identifier" TEXT NOT NULL,
    "provider" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_accounts" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "currency" "currency_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "type" "transaction_type" NOT NULL,
    "status" "transaction_staus" NOT NULL DEFAULT 'PENDING',
    "reference" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "ledger_account_id" TEXT NOT NULL,
    "direction" "ledger_direction" NOT NULL,
    "amount" DECIMAL(18,7) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_token_tokens" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "users_user_name_key" ON "users"("user_name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_wallet_currency" ON "wallets"("currency");

-- CreateIndex
CREATE INDEX "idx_wallet_user" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_currency_key" ON "wallets"("user_id", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "payment_accounts_network_identifier_key" ON "payment_accounts"("network", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE INDEX "idx_tx_reference" ON "transactions"("reference");

-- CreateIndex
CREATE INDEX "idx_tx_status" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "idx_tx_type" ON "transactions"("type");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
