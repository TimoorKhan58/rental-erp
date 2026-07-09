-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('DRAFT', 'RECEIVED', 'INSPECTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "return_inspections" (
    "id" UUID NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "rentalOrderId" UUID NOT NULL,
    "dispatchId" UUID NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "inspectedById" UUID NOT NULL,
    "remarks" TEXT,
    "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "receivedAt" TIMESTAMP(3),
    "inspectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_inspection_items" (
    "id" UUID NOT NULL,
    "returnInspectionId" UUID NOT NULL,
    "rentalOrderItemId" UUID NOT NULL,
    "returnedQuantity" INTEGER NOT NULL,
    "goodQuantity" INTEGER NOT NULL DEFAULT 0,
    "brokenQuantity" INTEGER NOT NULL DEFAULT 0,
    "repairQuantity" INTEGER NOT NULL DEFAULT 0,
    "lostQuantity" INTEGER NOT NULL DEFAULT 0,
    "missingQuantity" INTEGER NOT NULL DEFAULT 0,
    "damageCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "return_inspection_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "return_inspections_returnNumber_key" ON "return_inspections"("returnNumber");

-- CreateIndex
CREATE INDEX "return_inspections_rentalOrderId_idx" ON "return_inspections"("rentalOrderId");

-- CreateIndex
CREATE INDEX "return_inspections_dispatchId_idx" ON "return_inspections"("dispatchId");

-- CreateIndex
CREATE INDEX "return_inspections_inspectionDate_idx" ON "return_inspections"("inspectionDate");

-- CreateIndex
CREATE INDEX "return_inspections_status_idx" ON "return_inspections"("status");

-- AddForeignKey
ALTER TABLE "return_inspections" ADD CONSTRAINT "return_inspections_rentalOrderId_fkey" FOREIGN KEY ("rentalOrderId") REFERENCES "rental_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_inspections" ADD CONSTRAINT "return_inspections_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "dispatches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_inspections" ADD CONSTRAINT "return_inspections_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_inspection_items" ADD CONSTRAINT "return_inspection_items_returnInspectionId_fkey" FOREIGN KEY ("returnInspectionId") REFERENCES "return_inspections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_inspection_items" ADD CONSTRAINT "return_inspection_items_rentalOrderItemId_fkey" FOREIGN KEY ("rentalOrderItemId") REFERENCES "rental_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
