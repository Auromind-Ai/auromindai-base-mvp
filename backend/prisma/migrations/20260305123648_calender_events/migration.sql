/*
  Warnings:

  - The primary key for the `calendar_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `calendar_events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `workspace_id` on the `calendar_events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_pkey",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "google_event_id" TEXT,
ADD COLUMN     "sync_status" TEXT NOT NULL DEFAULT 'pending',
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "workspace_id",
ADD COLUMN     "workspace_id" UUID NOT NULL,
ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "calendar_events_workspace_id_idx" ON "calendar_events"("workspace_id");
