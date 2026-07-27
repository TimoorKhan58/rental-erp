-- Per-line rental dates on rental order items

ALTER TABLE "rental_order_items"
  ADD COLUMN "eventStartDate" DATE,
  ADD COLUMN "eventEndDate" DATE;

UPDATE "rental_order_items" AS roi
SET
  "eventStartDate" = ro."eventStartDate",
  "eventEndDate" = ro."eventEndDate"
FROM "rental_orders" AS ro
WHERE roi."rentalOrderId" = ro.id;

ALTER TABLE "rental_order_items"
  ALTER COLUMN "eventStartDate" SET NOT NULL,
  ALTER COLUMN "eventEndDate" SET NOT NULL;

CREATE INDEX "rental_order_items_eventStartDate_idx" ON "rental_order_items"("eventStartDate");
CREATE INDEX "rental_order_items_eventEndDate_idx" ON "rental_order_items"("eventEndDate");
