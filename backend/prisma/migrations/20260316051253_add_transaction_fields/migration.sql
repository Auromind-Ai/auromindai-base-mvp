-- CreateTable
CREATE TABLE "dashboard_notifications" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "invoice_number" TEXT,
    "company_name" TEXT,
    "transaction_type" TEXT,
    "amount" DOUBLE PRECISION,
    "currency" TEXT,
    "due_date" TEXT,
    "payment_date" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source_email_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);
