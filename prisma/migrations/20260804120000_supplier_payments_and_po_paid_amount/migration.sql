-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'SUPPLIER_PAYMENT';

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "supplier_payments" (
    "id" UUID NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "postedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_payments_paymentNumber_key" ON "supplier_payments"("paymentNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_payments_paymentNumber_idx" ON "supplier_payments"("paymentNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_payments_paymentDate_idx" ON "supplier_payments"("paymentDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_payments_status_idx" ON "supplier_payments"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_payments_purchaseOrderId_idx" ON "supplier_payments"("purchaseOrderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_payments_supplierId_idx" ON "supplier_payments"("supplierId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_payments_purchaseOrderId_paymentDate_idx" ON "supplier_payments"("purchaseOrderId", "paymentDate");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_payments_purchaseOrderId_fkey'
  ) THEN
    ALTER TABLE "supplier_payments"
      ADD CONSTRAINT "supplier_payments_purchaseOrderId_fkey"
      FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_payments_supplierId_fkey'
  ) THEN
    ALTER TABLE "supplier_payments"
      ADD CONSTRAINT "supplier_payments_supplierId_fkey"
      FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_payments_createdById_fkey'
  ) THEN
    ALTER TABLE "supplier_payments"
      ADD CONSTRAINT "supplier_payments_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
