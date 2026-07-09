-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "RepairType" AS ENUM ('CLEANING', 'WELDING', 'STITCHING', 'PAINTING', 'FRAME_REPAIR', 'FABRIC_REPAIR', 'OTHER');

-- CreateTable
CREATE TABLE "repairs" (
    "id" UUID NOT NULL,
    "repairNumber" TEXT NOT NULL,
    "returnInspectionId" UUID NOT NULL,
    "returnInspectionItemId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "repairDate" TIMESTAMP(3) NOT NULL,
    "assignedTo" TEXT,
    "estimatedCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "RepairStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_items" (
    "id" UUID NOT NULL,
    "repairId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "repairType" "RepairType" NOT NULL,
    "repairCost" DECIMAL(12,2) NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "repair_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repairs_repairNumber_key" ON "repairs"("repairNumber");

-- CreateIndex
CREATE INDEX "repairs_repairDate_idx" ON "repairs"("repairDate");

-- CreateIndex
CREATE INDEX "repairs_status_idx" ON "repairs"("status");

-- CreateIndex
CREATE INDEX "repairs_returnInspectionId_idx" ON "repairs"("returnInspectionId");

-- CreateIndex
CREATE INDEX "repairs_returnInspectionItemId_idx" ON "repairs"("returnInspectionItemId");

-- CreateIndex
CREATE INDEX "repairs_productId_idx" ON "repairs"("productId");

-- CreateIndex
CREATE INDEX "repairs_warehouseId_idx" ON "repairs"("warehouseId");

-- CreateIndex
CREATE INDEX "repair_items_repairId_idx" ON "repair_items"("repairId");

-- CreateIndex
CREATE INDEX "repair_items_productId_idx" ON "repair_items"("productId");

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_returnInspectionId_fkey" FOREIGN KEY ("returnInspectionId") REFERENCES "return_inspections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_items" ADD CONSTRAINT "repair_items_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "repairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_items" ADD CONSTRAINT "repair_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
