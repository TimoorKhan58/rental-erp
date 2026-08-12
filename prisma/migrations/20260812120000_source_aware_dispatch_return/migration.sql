-- AlterTable
ALTER TABLE "dispatch_items" ADD COLUMN IF NOT EXISTS "ownedQuantity" INTEGER;
ALTER TABLE "dispatch_items" ADD COLUMN IF NOT EXISTS "externalQuantity" INTEGER;

-- AlterTable
ALTER TABLE "return_inspection_items" ADD COLUMN IF NOT EXISTS "ownedQuantity" INTEGER;
ALTER TABLE "return_inspection_items" ADD COLUMN IF NOT EXISTS "externalQuantity" INTEGER;
