-- CreateEnum
CREATE TYPE "RentalInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "RentalInvoiceLineType" AS ENUM ('RENTAL_CHARGE', 'DELIVERY_CHARGE', 'PICKUP_CHARGE', 'DAMAGE_CHARGE', 'LOST_ITEM_CHARGE', 'REPAIR_CHARGE', 'MANUAL_CHARGE', 'DISCOUNT', 'TAX');

-- CreateTable
CREATE TABLE "rental_invoices" (
    "id" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "rentalOrderId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "dueDate" DATE,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL,
    "grandTotal" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL,
    "status" "RentalInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_invoice_items" (
    "id" UUID NOT NULL,
    "rentalInvoiceId" UUID NOT NULL,
    "lineType" "RentalInvoiceLineType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rental_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rental_invoices_invoiceNumber_key" ON "rental_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "rental_invoices_invoiceNumber_idx" ON "rental_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "rental_invoices_rentalOrderId_idx" ON "rental_invoices"("rentalOrderId");

-- CreateIndex
CREATE INDEX "rental_invoices_customerId_idx" ON "rental_invoices"("customerId");

-- CreateIndex
CREATE INDEX "rental_invoices_invoiceDate_idx" ON "rental_invoices"("invoiceDate");

-- CreateIndex
CREATE INDEX "rental_invoices_status_idx" ON "rental_invoices"("status");

-- CreateIndex
CREATE INDEX "rental_invoices_customerId_status_idx" ON "rental_invoices"("customerId", "status");

-- CreateIndex
CREATE INDEX "rental_invoice_items_rentalInvoiceId_idx" ON "rental_invoice_items"("rentalInvoiceId");

-- AddForeignKey
ALTER TABLE "rental_invoices" ADD CONSTRAINT "rental_invoices_rentalOrderId_fkey" FOREIGN KEY ("rentalOrderId") REFERENCES "rental_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_invoices" ADD CONSTRAINT "rental_invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_invoices" ADD CONSTRAINT "rental_invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_invoice_items" ADD CONSTRAINT "rental_invoice_items_rentalInvoiceId_fkey" FOREIGN KEY ("rentalInvoiceId") REFERENCES "rental_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
