-- Phase 28.1 — additive source × condition attribution on return inspection items.
-- Existing rows keep 0; do not fabricate historical owned/external condition splits.

ALTER TABLE "return_inspection_items" ADD COLUMN IF NOT EXISTS "ownedGoodQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "return_inspection_items" ADD COLUMN IF NOT EXISTS "ownedDamagedQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "return_inspection_items" ADD COLUMN IF NOT EXISTS "ownedLostQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "return_inspection_items" ADD COLUMN IF NOT EXISTS "externalGoodQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "return_inspection_items" ADD COLUMN IF NOT EXISTS "externalDamagedQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "return_inspection_items" ADD COLUMN IF NOT EXISTS "externalLostQuantity" INTEGER NOT NULL DEFAULT 0;
