-- Reshape inventory table for product + warehouse scoped records (Phase 5-008)

-- Drop legacy unique constraint on productId alone
ALTER TABLE "inventory" DROP CONSTRAINT IF EXISTS "inventory_productId_key";

-- Add warehouse and catalog fields
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "warehouseId" UUID;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "quantityOnHand" INTEGER;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "minimumStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "maximumStock" INTEGER;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Migrate legacy quantities when present
UPDATE "inventory"
SET
  "quantityOnHand" = COALESCE("quantityOnHand", "totalQuantity", 0),
  "reservedQuantity" = COALESCE("reservedQuantity", 0)
WHERE "quantityOnHand" IS NULL;

-- Remove rows that cannot be mapped to a warehouse (dev-safe empty-table assumption)
DELETE FROM "inventory" WHERE "warehouseId" IS NULL;

-- Drop legacy columns
ALTER TABLE "inventory" DROP COLUMN IF EXISTS "totalQuantity";
ALTER TABLE "inventory" DROP COLUMN IF EXISTS "availableQuantity";
ALTER TABLE "inventory" DROP COLUMN IF EXISTS "onRentQuantity";
ALTER TABLE "inventory" DROP COLUMN IF EXISTS "repairQuantity";
ALTER TABLE "inventory" DROP COLUMN IF EXISTS "lostQuantity";

-- Enforce required fields
ALTER TABLE "inventory" ALTER COLUMN "warehouseId" SET NOT NULL;
ALTER TABLE "inventory" ALTER COLUMN "quantityOnHand" SET NOT NULL;
ALTER TABLE "inventory" ALTER COLUMN "reservedQuantity" SET DEFAULT 0;

-- Foreign key to warehouses
ALTER TABLE "inventory"
  ADD CONSTRAINT "inventory_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Unique product + warehouse
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_productId_warehouseId_key"
  ON "inventory"("productId", "warehouseId");

-- Indexes
CREATE INDEX IF NOT EXISTS "inventory_warehouseId_idx" ON "inventory"("warehouseId");
CREATE INDEX IF NOT EXISTS "inventory_isActive_idx" ON "inventory"("isActive");
