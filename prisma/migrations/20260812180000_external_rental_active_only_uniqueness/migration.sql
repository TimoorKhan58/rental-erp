-- Phase 25.10: replace forever uniqueness with active-only uniqueness so a
-- CANCELLED external rental agreement does not permanently block re-create
-- for the same rental order (BD-C3 / BD-C4).

-- Drop forever uniques
DROP INDEX IF EXISTS "external_rental_agreements_rentalOrderId_key";
DROP INDEX IF EXISTS "external_rental_agreement_items_rentalOrderItemId_key";

-- Active-only uniqueness: at most one non-CANCELLED agreement per rental order
CREATE UNIQUE INDEX "external_rental_agreements_rentalOrderId_active_key"
  ON "external_rental_agreements"("rentalOrderId")
  WHERE "status" <> 'CANCELLED';

-- Per-agreement item uniqueness (replacement agreements may reuse RO lines)
CREATE UNIQUE INDEX "external_rental_agreement_items_agreementId_rentalOrderItemId_key"
  ON "external_rental_agreement_items"("agreementId", "rentalOrderItemId");

-- Non-unique lookup index for rentalOrderId (Prisma @@index)
CREATE INDEX IF NOT EXISTS "external_rental_agreements_rentalOrderId_idx"
  ON "external_rental_agreements"("rentalOrderId");
