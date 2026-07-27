-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL,
    "warehouseCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_warehouseCode_key" ON "warehouses"("warehouseCode");

-- CreateIndex
CREATE INDEX "warehouses_name_idx" ON "warehouses"("name");

-- CreateIndex
CREATE INDEX "warehouses_isActive_idx" ON "warehouses"("isActive");
