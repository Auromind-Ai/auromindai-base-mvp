/*
  Warnings:

  - You are about to drop the column `title` on the `conversations` table. All the data in the column will be lost.
  - The `channel` column on the `conversations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `conversations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `messages` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `phone` to the `conversations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('WEB', 'WHATSAPP', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('USER', 'AI', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('RECEIVED', 'SUGGESTED', 'SENT');

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_fkey";

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "title",
ADD COLUMN     "phone" VARCHAR(20) NOT NULL,
DROP COLUMN "channel",
ADD COLUMN     "channel" "ChannelType" NOT NULL DEFAULT 'WEB',
DROP COLUMN "status",
ADD COLUMN     "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN';

-- DropTable
DROP TABLE "messages";

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" UUID NOT NULL,
    "content" TEXT,
    "senderType" "SenderType" NOT NULL DEFAULT 'USER',
    "status" "MessageStatus" NOT NULL DEFAULT 'RECEIVED',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "externalId" TEXT,
    "metadataJson" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_reply_logs" ADD CONSTRAINT "email_reply_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
