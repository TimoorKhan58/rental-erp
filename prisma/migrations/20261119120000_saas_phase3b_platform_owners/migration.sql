-- SaaS phase 3b: platform owners and their audit log.
-- Platform tables have no organizationId: they belong to no business and
-- are used only by platform code. A platform owner is a login that is
-- never linked to an ERP user. targetOrganizationId has no foreign key on
-- purpose, so the audit trail survives if a business is ever removed.

-- CreateTable
CREATE TABLE "platform_owners" (
    "id" UUID NOT NULL,
    "authUserId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" UUID NOT NULL,
    "platformOwnerId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "targetOrganizationId" UUID,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_owners_authUserId_key" ON "platform_owners"("authUserId");

-- CreateIndex
CREATE INDEX "platform_audit_logs_createdAt_idx" ON "platform_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "platform_audit_logs_targetOrganizationId_idx" ON "platform_audit_logs"("targetOrganizationId");

-- CreateIndex
CREATE INDEX "platform_audit_logs_platformOwnerId_idx" ON "platform_audit_logs"("platformOwnerId");

-- AddForeignKey
ALTER TABLE "platform_owners" ADD CONSTRAINT "platform_owners_authUserId_fkey" FOREIGN KEY ("authUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_platformOwnerId_fkey" FOREIGN KEY ("platformOwnerId") REFERENCES "platform_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

