-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RENTAL_ORDER', 'PAYMENT', 'DISPATCH', 'EXPENSE', 'REPAIR', 'CUSTOMER', 'PRODUCT');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "BackupFrequency" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "company_settings" (
    "id" UUID NOT NULL,
    "companyName" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT,
    "phone" TEXT NOT NULL,
    "secondaryPhone" TEXT,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "postalCode" TEXT,
    "ntn" TEXT,
    "strn" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "currencyCode" TEXT NOT NULL,
    "currencySymbol" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "dateFormat" TEXT NOT NULL,
    "timeFormat" TEXT NOT NULL,
    "numberFormat" TEXT NOT NULL,
    "defaultRentalDays" INTEGER NOT NULL,
    "defaultTaxPercentage" DECIMAL(5,2) NOT NULL,
    "fiscalYearStartMonth" INTEGER NOT NULL DEFAULT 1,
    "securityDepositEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lateFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" UUID NOT NULL,
    "companySettingId" UUID NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "prefix" TEXT NOT NULL,
    "suffix" TEXT,
    "startingNumber" INTEGER NOT NULL,
    "currentNumber" INTEGER NOT NULL,
    "paddingLength" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL,
    "appName" TEXT NOT NULL,
    "appVersion" TEXT NOT NULL,
    "environment" "Environment" NOT NULL DEFAULT 'DEVELOPMENT',
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "minPasswordLength" INTEGER NOT NULL DEFAULT 8,
    "maxLoginAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockoutDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "requireEmailVerification" BOOLEAN NOT NULL DEFAULT false,
    "allowPasswordReset" BOOLEAN NOT NULL DEFAULT true,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 60,
    "rememberMeDurationDays" INTEGER NOT NULL DEFAULT 7,
    "maxConcurrentSessions" INTEGER NOT NULL DEFAULT 3,
    "passwordExpiryDays" INTEGER,
    "ipWhitelistEnabled" BOOLEAN NOT NULL DEFAULT false,
    "auditLogRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "maxUploadSizeMb" INTEGER NOT NULL DEFAULT 10,
    "allowedFileTypes" TEXT NOT NULL,
    "uploadStoragePath" TEXT,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultNotificationEmail" TEXT,
    "backupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupFrequency" "BackupFrequency" NOT NULL DEFAULT 'DAILY',
    "backupRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "lastBackupAt" TIMESTAMP(3),
    "defaultDashboardView" TEXT NOT NULL DEFAULT 'overview',
    "recentItemsLimit" INTEGER NOT NULL DEFAULT 10,
    "chartDefaultPeriodDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "systemSettingId" UUID NOT NULL,
    "featureKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_companySettingId_documentType_key" ON "document_sequences"("companySettingId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_systemSettingId_featureKey_key" ON "feature_flags"("systemSettingId", "featureKey");

-- CreateIndex
CREATE INDEX "feature_flags_featureKey_idx" ON "feature_flags"("featureKey");

-- CreateIndex
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags"("enabled");

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_companySettingId_fkey" FOREIGN KEY ("companySettingId") REFERENCES "company_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_systemSettingId_fkey" FOREIGN KEY ("systemSettingId") REFERENCES "system_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default company settings
INSERT INTO "company_settings" (
    "id", "companyName", "businessName", "phone", "email", "address", "city", "province", "country",
    "currencyCode", "currencySymbol", "timezone", "language", "dateFormat", "timeFormat", "numberFormat",
    "defaultRentalDays", "defaultTaxPercentage", "fiscalYearStartMonth", "setupCompleted", "createdAt", "updatedAt"
) VALUES (
    'cs000001-0000-4000-8000-000000000001',
    'Manyar Tent Service',
    'Manyar Tent Service',
    '+920000000000',
    'info@manyartent.com',
    'Main Office',
    'Lahore',
    'Punjab',
    'Pakistan',
    'PKR',
    'Rs',
    'Asia/Karachi',
    'en',
    'DD/MM/YYYY',
    'HH:mm',
    '#,##0.00',
    3,
    0.00,
    7,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Seed default system settings
INSERT INTO "system_settings" (
    "id", "appName", "appVersion", "allowedFileTypes", "createdAt", "updatedAt"
) VALUES (
    'ss000001-0000-4000-8000-000000000001',
    'Rental ERP',
    '0.1.0',
    'pdf,jpg,jpeg,png,doc,docx,xls,xlsx',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Seed document sequences
INSERT INTO "document_sequences" (
    "id", "companySettingId", "documentType", "prefix", "startingNumber", "currentNumber", "paddingLength", "createdAt", "updatedAt"
) VALUES
    ('ds000001-0000-4000-8000-000000000001', 'cs000001-0000-4000-8000-000000000001', 'RENTAL_ORDER', 'RO-', 1, 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ds000001-0000-4000-8000-000000000002', 'cs000001-0000-4000-8000-000000000001', 'PAYMENT', 'PAY-', 1, 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ds000001-0000-4000-8000-000000000003', 'cs000001-0000-4000-8000-000000000001', 'DISPATCH', 'DSP-', 1, 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ds000001-0000-4000-8000-000000000004', 'cs000001-0000-4000-8000-000000000001', 'EXPENSE', 'EXP-', 1, 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ds000001-0000-4000-8000-000000000005', 'cs000001-0000-4000-8000-000000000001', 'REPAIR', 'RPR-', 1, 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ds000001-0000-4000-8000-000000000006', 'cs000001-0000-4000-8000-000000000001', 'CUSTOMER', 'CUS-', 1, 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ds000001-0000-4000-8000-000000000007', 'cs000001-0000-4000-8000-000000000001', 'PRODUCT', 'PRD-', 1, 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
