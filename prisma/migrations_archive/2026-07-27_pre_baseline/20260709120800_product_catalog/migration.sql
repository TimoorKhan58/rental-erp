-- AlterTable
ALTER TABLE "products" ALTER COLUMN "categoryId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "totalQuantity" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_productCode_idx" ON "products"("productCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_isActive_idx" ON "products"("isActive");

-- DropIndex
DROP INDEX IF EXISTS "products_isActive_isRentable_idx";
