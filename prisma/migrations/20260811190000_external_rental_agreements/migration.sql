-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'EXTERNAL_RENTAL_AGREEMENT';

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExternalRentalAgreementStatus') THEN
    CREATE TYPE "ExternalRentalAgreementStatus" AS ENUM (
      'DRAFT',
      'CONFIRMED',
      'PARTIALLY_RECEIVED',
      'RECEIVED',
      'ALLOCATED',
      'IN_USE',
      'RETURN_PENDING',
      'RETURNED',
      'CANCELLED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExternalRentalSettlementStatus') THEN
    CREATE TYPE "ExternalRentalSettlementStatus" AS ENUM (
      'UNSETTLED',
      'PARTIALLY_SETTLED',
      'SETTLED'
    );
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "external_rental_agreements" (
    "id" UUID NOT NULL,
    "agreementNumber" TEXT NOT NULL,
    "supplierId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "rentalOrderId" UUID NOT NULL,
    "status" "ExternalRentalAgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "settlementStatus" "ExternalRentalSettlementStatus" NOT NULL DEFAULT 'UNSETTLED',
    "hireStartDate" DATE NOT NULL,
    "hireEndDate" DATE NOT NULL,
    "expectedReturnToSupplierDate" DATE NOT NULL,
    "totalHireInCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_rental_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "external_rental_agreement_items" (
    "id" UUID NOT NULL,
    "agreementId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "rentalOrderItemId" UUID NOT NULL,
    "quantityRequested" INTEGER NOT NULL,
    "quantityConfirmed" INTEGER NOT NULL DEFAULT 0,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "quantityAllocated" INTEGER NOT NULL DEFAULT 0,
    "quantityDispatched" INTEGER NOT NULL DEFAULT 0,
    "quantityReturnedFromCustomer" INTEGER NOT NULL DEFAULT 0,
    "quantityReturnedToSupplier" INTEGER NOT NULL DEFAULT 0,
    "quantityWrittenOff" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "lineHireInCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_rental_agreement_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "external_rental_agreements_agreementNumber_key"
  ON "external_rental_agreements"("agreementNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "external_rental_agreements_rentalOrderId_key"
  ON "external_rental_agreements"("rentalOrderId");

CREATE INDEX IF NOT EXISTS "external_rental_agreements_supplierId_idx"
  ON "external_rental_agreements"("supplierId");

CREATE INDEX IF NOT EXISTS "external_rental_agreements_warehouseId_idx"
  ON "external_rental_agreements"("warehouseId");

CREATE INDEX IF NOT EXISTS "external_rental_agreements_status_idx"
  ON "external_rental_agreements"("status");

CREATE INDEX IF NOT EXISTS "external_rental_agreements_settlementStatus_idx"
  ON "external_rental_agreements"("settlementStatus");

CREATE INDEX IF NOT EXISTS "external_rental_agreements_hireStartDate_idx"
  ON "external_rental_agreements"("hireStartDate");

CREATE INDEX IF NOT EXISTS "external_rental_agreements_hireEndDate_idx"
  ON "external_rental_agreements"("hireEndDate");

CREATE UNIQUE INDEX IF NOT EXISTS "external_rental_agreement_items_rentalOrderItemId_key"
  ON "external_rental_agreement_items"("rentalOrderItemId");

CREATE INDEX IF NOT EXISTS "external_rental_agreement_items_agreementId_idx"
  ON "external_rental_agreement_items"("agreementId");

CREATE INDEX IF NOT EXISTS "external_rental_agreement_items_productId_idx"
  ON "external_rental_agreement_items"("productId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'external_rental_agreements_supplierId_fkey'
  ) THEN
    ALTER TABLE "external_rental_agreements"
      ADD CONSTRAINT "external_rental_agreements_supplierId_fkey"
      FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'external_rental_agreements_warehouseId_fkey'
  ) THEN
    ALTER TABLE "external_rental_agreements"
      ADD CONSTRAINT "external_rental_agreements_warehouseId_fkey"
      FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'external_rental_agreements_rentalOrderId_fkey'
  ) THEN
    ALTER TABLE "external_rental_agreements"
      ADD CONSTRAINT "external_rental_agreements_rentalOrderId_fkey"
      FOREIGN KEY ("rentalOrderId") REFERENCES "rental_orders"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'external_rental_agreements_createdById_fkey'
  ) THEN
    ALTER TABLE "external_rental_agreements"
      ADD CONSTRAINT "external_rental_agreements_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'external_rental_agreement_items_agreementId_fkey'
  ) THEN
    ALTER TABLE "external_rental_agreement_items"
      ADD CONSTRAINT "external_rental_agreement_items_agreementId_fkey"
      FOREIGN KEY ("agreementId") REFERENCES "external_rental_agreements"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'external_rental_agreement_items_productId_fkey'
  ) THEN
    ALTER TABLE "external_rental_agreement_items"
      ADD CONSTRAINT "external_rental_agreement_items_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'external_rental_agreement_items_rentalOrderItemId_fkey'
  ) THEN
    ALTER TABLE "external_rental_agreement_items"
      ADD CONSTRAINT "external_rental_agreement_items_rentalOrderItemId_fkey"
      FOREIGN KEY ("rentalOrderItemId") REFERENCES "rental_order_items"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
