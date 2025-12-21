/*
  Warnings:

  - You are about to alter the column `amount` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,7)`.
  - The `status` column on the `transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `previous_balance` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,7)`.
  - You are about to alter the column `new_balance` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,7)`.
  - You are about to alter the column `balance` on the `wallets` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,7)`.
  - The `status` column on the `wallets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[user_name]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[wallet_address]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,type]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `action` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `user_name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `wallets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "CurrencyType" AS ENUM ('NGN', 'USDT', 'BTC', 'ETH', 'BNB', 'TRX');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('FUNDING', 'PAYOUT', 'TRANSFER', 'PAYMENT');

-- CreateEnum
CREATE TYPE "TransactionStaus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "TransferAction" AS ENUM ('WITHDRAW', 'DEPOSIT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'FROZEN');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "action" "TransferAction" NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,7),
DROP COLUMN "type",
ADD COLUMN     "type" "CurrencyType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "TransactionStaus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "previous_balance" SET DATA TYPE DECIMAL(18,7),
ALTER COLUMN "new_balance" SET DATA TYPE DECIMAL(18,7);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "account_number" VARCHAR(10),
ADD COLUMN     "user_name" VARCHAR(50) NOT NULL;

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "wallet_address" VARCHAR(100),
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(18,7),
DROP COLUMN "type",
ADD COLUMN     "type" "CurrencyType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "idx_tx_status" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "idx_tx_type" ON "transactions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "users_user_name_key" ON "users"("user_name");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_wallet_address_key" ON "wallets"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_type_key" ON "wallets"("user_id", "type");
