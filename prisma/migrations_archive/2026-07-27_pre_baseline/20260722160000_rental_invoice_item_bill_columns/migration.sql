-- Customer bill columns on invoice lines

ALTER TABLE "rental_invoice_items"
  ADD COLUMN "productName" TEXT,
  ADD COLUMN "dailyRate" DECIMAL(12, 2),
  ADD COLUMN "numberOfDays" INTEGER,
  ADD COLUMN "damagedQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lostQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "missingQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "notes" TEXT;
