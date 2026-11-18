-- SaaS phase 4c: plan and limits per business (set by the platform owner;
-- null = no limit) and each user's last sign-in time. Additive only.

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "maxUsers" INTEGER,
ADD COLUMN     "maxWarehouses" INTEGER,
ADD COLUMN     "planName" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastSignInAt" TIMESTAMP(3);

