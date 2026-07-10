-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('VENDOR', 'MANUAL');

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "categoryId" UUID NOT NULL,
    "expenseType" "ExpenseType" NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "supplierId" UUID,
    "vendorName" TEXT,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "attachmentRef" TEXT,
    "referenceNumber" TEXT,
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "journalEntryId" UUID,
    "recordedById" UUID NOT NULL,
    "approvedById" UUID,
    "paidById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE INDEX "expense_categories_isActive_idx" ON "expense_categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_expenseNumber_key" ON "expenses"("expenseNumber");

-- CreateIndex
CREATE INDEX "expenses_expenseDate_idx" ON "expenses"("expenseDate");

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "expenses"("status");

-- CreateIndex
CREATE INDEX "expenses_categoryId_idx" ON "expenses"("categoryId");

-- CreateIndex
CREATE INDEX "expenses_supplierId_idx" ON "expenses"("supplierId");

-- CreateIndex
CREATE INDEX "expenses_expenseDate_status_idx" ON "expenses"("expenseDate", "status");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default expense categories
INSERT INTO "expense_categories" ("id", "name", "description", "isActive", "createdAt", "updatedAt") VALUES
  ('ec000001-0000-4000-8000-000000000001', 'Fuel', 'Fuel and energy costs', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ec000001-0000-4000-8000-000000000002', 'Labour', 'Labour and wages', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ec000001-0000-4000-8000-000000000003', 'Vehicle Maintenance', 'Vehicle servicing and maintenance', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ec000001-0000-4000-8000-000000000004', 'Repair', 'Equipment repair costs', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ec000001-0000-4000-8000-000000000005', 'Office', 'Office supplies and administration', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ec000001-0000-4000-8000-000000000006', 'Purchase', 'General purchases', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ec000001-0000-4000-8000-000000000007', 'Utility', 'Utilities and services', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ec000001-0000-4000-8000-000000000008', 'Transport', 'Transport and logistics', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ec000001-0000-4000-8000-000000000009', 'Miscellaneous', 'Other operational expenses', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
