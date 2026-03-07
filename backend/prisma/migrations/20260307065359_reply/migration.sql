-- CreateTable
CREATE TABLE "email_reply_logs" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "thread_id" TEXT,
    "message_id" TEXT,
    "reply_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_reply_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_reply_logs_workspace_id_idx" ON "email_reply_logs"("workspace_id");

-- CreateIndex
CREATE INDEX "email_reply_logs_thread_id_idx" ON "email_reply_logs"("thread_id");
