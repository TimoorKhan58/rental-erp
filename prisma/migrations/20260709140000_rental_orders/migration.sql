-- CreateEnum
CREATE TYPE "RentalOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'RESERVED', 'DISPATCHED', 'ON_RENT', 'PARTIALLY_RETURNED', 'RETURNED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "rental_orders" (
    "id" UUID NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "status" "RentalOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "bookingDate" DATE NOT NULL,
    "eventStartDate" DATE NOT NULL,
    "eventEndDate" DATE NOT NULL,
    "expectedReturnDate" DATE NOT NULL,
    "actualReturnDate" DATE,
    "deliveryRequired" BOOLEAN NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryCharges" DECIMAL(12,2) NOT NULL,
    "labourCharges" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "grandTotal" DECIMAL(12,2) NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_order_items" (
    "id" UUID NOT NULL,
    "rentalOrderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "rentalPricePerDay" DECIMAL(12,2) NOT NULL,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "numberOfDays" INTEGER NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "rental_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rental_orders_orderNumber_key" ON "rental_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "rental_orders_customerId_idx" ON "rental_orders"("customerId");

-- CreateIndex
CREATE INDEX "rental_orders_warehouseId_idx" ON "rental_orders"("warehouseId");

-- CreateIndex
CREATE INDEX "rental_orders_status_idx" ON "rental_orders"("status");

-- CreateIndex
CREATE INDEX "rental_orders_customerId_status_idx" ON "rental_orders"("customerId", "status");

-- CreateIndex
CREATE INDEX "rental_orders_eventStartDate_idx" ON "rental_orders"("eventStartDate");

-- CreateIndex
CREATE INDEX "rental_orders_eventEndDate_idx" ON "rental_orders"("eventEndDate");

-- CreateIndex
CREATE INDEX "rental_order_items_rentalOrderId_idx" ON "rental_order_items"("rentalOrderId");

-- CreateIndex
CREATE INDEX "rental_order_items_productId_idx" ON "rental_order_items"("productId");

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_order_items" ADD CONSTRAINT "rental_order_items_rentalOrderId_fkey" FOREIGN KEY ("rentalOrderId") REFERENCES "rental_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_order_items" ADD CONSTRAINT "rental_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
