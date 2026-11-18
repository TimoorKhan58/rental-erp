-- SaaS phase 3c: users whose password was chosen by someone else (a new
-- business owner, or a reset by the platform owner) must choose their own
-- before using the app. Existing users are unaffected (default false).

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

