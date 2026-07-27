-- Drop existing payments table (legacy rental-order payments, no module implementation)
DROP TABLE IF EXISTS "payments";

-- DropEnum
DROP TYPE IF EXISTS "PaymentType";

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'POSTED', 'VOID');

-- AlterEnum: replace PaymentMethod values
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'ONLINE', 'OTHER');
DROP TYPE "PaymentMethod_old";

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "rentalInvoiceId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
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

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentNumber_key" ON "payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "payments_paymentNumber_idx" ON "payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "payments_paymentDate_idx" ON "payments"("paymentDate");

-- CreateIndex
CREATE INDEX "payments_paymentMethod_idx" ON "payments"("paymentMethod");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_rentalInvoiceId_idx" ON "payments"("rentalInvoiceId");

-- CreateIndex
CREATE INDEX "payments_customerId_idx" ON "payments"("customerId");

-- CreateIndex
CREATE INDEX "payments_rentalInvoiceId_paymentDate_idx" ON "payments"("rentalInvoiceId", "paymentDate");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_rentalInvoiceId_fkey" FOREIGN KEY ("rentalInvoiceId") REFERENCES "rental_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
