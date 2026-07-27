-- Stock movement ledger (Phase 5-009)

CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'RESERVE', 'RELEASE', 'ADJUSTMENT');

CREATE TABLE "inventory_transactions" (
    "id" UUID NOT NULL,
    "inventoryId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_transactions_inventoryId_idx" ON "inventory_transactions"("inventoryId");
CREATE INDEX "inventory_transactions_productId_idx" ON "inventory_transactions"("productId");
CREATE INDEX "inventory_transactions_warehouseId_idx" ON "inventory_transactions"("warehouseId");
CREATE INDEX "inventory_transactions_movementType_idx" ON "inventory_transactions"("movementType");
CREATE INDEX "inventory_transactions_createdAt_idx" ON "inventory_transactions"("createdAt");

ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
