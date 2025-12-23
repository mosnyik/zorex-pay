/*
  Warnings:

  - You are about to drop the `Rate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Rate";

-- CreateTable
CREATE TABLE "rate" (
    "id" TEXT NOT NULL,
    "currency_from" VARCHAR(20) NOT NULL,
    "currency_to" VARCHAR(20) NOT NULL,
    "current_rate" DECIMAL(18,7) NOT NULL,
    "merchant_rate" DECIMAL(18,7) NOT NULL,
    "profit_rate" DECIMAL(18,7),
    "current_rate_used" DECIMAL(18,7),
    "merchant_rate_used" DECIMAL(18,7),
    "profit_rate_used" DECIMAL(18,7),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_pkey" PRIMARY KEY ("id")
);
