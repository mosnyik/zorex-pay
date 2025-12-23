/*
  Warnings:

  - You are about to drop the column `created_at` on the `LedgerEntry` table. All the data in the column will be lost.
  - You are about to alter the column `replacedByToken` on the `RefreshToken` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- AlterTable
ALTER TABLE "LedgerEntry" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "replacedByToken" SET DATA TYPE VARCHAR(255);
