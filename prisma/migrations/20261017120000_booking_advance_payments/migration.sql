CREATE TYPE "AdvancePaymentStatus" AS ENUM ('PENDING', 'POSTED', 'VOID');

CREATE TABLE "advance_payments" (
    "id" UUID NOT NULL,
    "advanceNumber" TEXT NOT NULL,
    "rentalOrderId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "rentalInvoiceId" UUID,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "appliedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "status" "AdvancePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "postedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "advance_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "advance_payments_positive_amount" CHECK ("amount" > 0),
    CONSTRAINT "advance_payments_nonnegative_settlement" CHECK ("appliedAmount" >= 0 AND "refundedAmount" >= 0),
    CONSTRAINT "advance_payments_settlement_limit" CHECK ("appliedAmount" + "refundedAmount" <= "amount"),
    CONSTRAINT "advance_payments_applied_invoice_required" CHECK ("appliedAmount" = 0 OR "rentalInvoiceId" IS NOT NULL)
);

CREATE UNIQUE INDEX "advance_payments_advanceNumber_key" ON "advance_payments"("advanceNumber");
CREATE INDEX "advance_payments_rentalOrderId_status_idx" ON "advance_payments"("rentalOrderId", "status");
CREATE INDEX "advance_payments_customerId_idx" ON "advance_payments"("customerId");
CREATE INDEX "advance_payments_rentalInvoiceId_idx" ON "advance_payments"("rentalInvoiceId");

ALTER TABLE "advance_payments" ADD CONSTRAINT "advance_payments_rentalOrderId_fkey" FOREIGN KEY ("rentalOrderId") REFERENCES "rental_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "advance_payments" ADD CONSTRAINT "advance_payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "advance_payments" ADD CONSTRAINT "advance_payments_rentalInvoiceId_fkey" FOREIGN KEY ("rentalInvoiceId") REFERENCES "rental_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "advance_payments" ADD CONSTRAINT "advance_payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
