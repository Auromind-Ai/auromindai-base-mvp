/*
  Warnings:

  - You are about to drop the column `created_at` on the `invoices` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `invoices` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "created_at",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
