-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceServiceType" AS ENUM ('PREVENTIVE', 'CLEANING', 'INSPECTION', 'CALIBRATION', 'LUBRICATION', 'OTHER');

-- CreateTable
CREATE TABLE "maintenances" (
    "id" UUID NOT NULL,
    "maintenanceNumber" TEXT NOT NULL,
    "productId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "inventoryId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "serviceType" "MaintenanceServiceType" NOT NULL,
    "technician" TEXT,
    "vendor" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "estimatedCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "maintenances_maintenanceNumber_key" ON "maintenances"("maintenanceNumber");

-- CreateIndex
CREATE INDEX "maintenances_maintenanceNumber_idx" ON "maintenances"("maintenanceNumber");

-- CreateIndex
CREATE INDEX "maintenances_productId_idx" ON "maintenances"("productId");

-- CreateIndex
CREATE INDEX "maintenances_warehouseId_idx" ON "maintenances"("warehouseId");

-- CreateIndex
CREATE INDEX "maintenances_inventoryId_idx" ON "maintenances"("inventoryId");

-- CreateIndex
CREATE INDEX "maintenances_scheduledDate_idx" ON "maintenances"("scheduledDate");

-- CreateIndex
CREATE INDEX "maintenances_status_idx" ON "maintenances"("status");

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
