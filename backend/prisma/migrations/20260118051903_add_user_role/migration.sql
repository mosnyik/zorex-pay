-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('USER', 'MERCHANT', 'ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "user_role" NOT NULL DEFAULT 'USER';
