-- Phase 6-021: Identity & User Administration
-- Reconcile better-auth `user` with ERP `users`/`roles` tables.

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "authUserId" TEXT,
    "roleId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Seed canonical ERP roles (deterministic UUIDs for reproducible environments)
INSERT INTO "roles" ("id", "name") VALUES
    ('00000000-0000-4000-8000-000000000001', 'owner'),
    ('00000000-0000-4000-8000-000000000002', 'manager'),
    ('00000000-0000-4000-8000-000000000003', 'worker'),
    ('00000000-0000-4000-8000-000000000004', 'accountant'),
    ('00000000-0000-4000-8000-000000000005', 'viewer');

-- Bridge better-auth users to ERP users
ALTER TABLE "user" ADD COLUMN "erpUserId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_authUserId_key" ON "users"("authUserId");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "user_erpUserId_key" ON "user"("erpUserId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_erpUserId_fkey" FOREIGN KEY ("erpUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill ERP users from existing better-auth accounts
INSERT INTO "users" ("id", "name", "email", "authUserId", "roleId", "isActive", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    auth_user."name",
    auth_user."email",
    auth_user."id",
    roles."id",
    true,
    auth_user."createdAt",
    auth_user."updatedAt"
FROM "user" AS auth_user
INNER JOIN "roles" AS roles ON roles."name" = auth_user."role"
WHERE NOT EXISTS (
    SELECT 1 FROM "users" AS existing WHERE existing."authUserId" = auth_user."id"
);

UPDATE "user" AS auth_user
SET "erpUserId" = erp_user."id"
FROM "users" AS erp_user
WHERE erp_user."authUserId" = auth_user."id"
  AND auth_user."erpUserId" IS NULL;
