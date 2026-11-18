-- SaaS phase 4d: when a business was deactivated (permanent removal is only
-- allowed 30 days later). Businesses already inactive count from their last
-- update.

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "deactivatedAt" TIMESTAMP(3);

-- Backfill
UPDATE "organizations" SET "deactivatedAt" = "updatedAt" WHERE "isActive" = false AND "deactivatedAt" IS NULL;
