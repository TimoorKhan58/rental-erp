-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('DELIVERY', 'CUSTOMER_PICKUP');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('DRAFT', 'READY', 'DISPATCHED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "dispatches" (
    "id" UUID NOT NULL,
    "dispatchNumber" TEXT NOT NULL,
    "rentalOrderId" UUID NOT NULL,
    "dispatchDate" TIMESTAMP(3) NOT NULL,
    "deliveryMethod" "DeliveryMethod" NOT NULL,
    "vehicleNumber" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "deliveryAddress" TEXT NOT NULL,
    "remarks" TEXT,
    "status" "DispatchStatus" NOT NULL DEFAULT 'DRAFT',
    "loadedAt" TIMESTAMP(3),
    "departedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_items" (
    "id" UUID NOT NULL,
    "dispatchId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "rentalOrderItemId" UUID,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "dispatch_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dispatches_dispatchNumber_key" ON "dispatches"("dispatchNumber");

-- CreateIndex
CREATE INDEX "dispatches_rentalOrderId_idx" ON "dispatches"("rentalOrderId");

-- CreateIndex
CREATE INDEX "dispatches_dispatchDate_idx" ON "dispatches"("dispatchDate");

-- CreateIndex
CREATE INDEX "dispatches_status_idx" ON "dispatches"("status");

-- CreateIndex
CREATE INDEX "dispatch_items_dispatchId_idx" ON "dispatch_items"("dispatchId");

-- CreateIndex
CREATE INDEX "dispatch_items_productId_idx" ON "dispatch_items"("productId");

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_rentalOrderId_fkey" FOREIGN KEY ("rentalOrderId") REFERENCES "rental_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "dispatches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_rentalOrderItemId_fkey" FOREIGN KEY ("rentalOrderItemId") REFERENCES "rental_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
