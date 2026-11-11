-- SaaS phase 1: organizations (tenants).
-- Adds "organizations", gives 49 per-business tables an "organizationId"
-- (default: the first organization, so existing code and data keep working),
-- and makes business numbers/names unique per organization.
-- Legacy tables login_events and purchase_order_payments, and the index
-- users_lastLoginAt_idx, are intentionally
-- left untouched (they hold data and are outside this change).

-- DropIndex
DROP INDEX "accounts_accountCode_key";

-- DropIndex
DROP INDEX "asset_categories_name_key";

-- DropIndex
DROP INDEX "assets_assetCode_key";

-- DropIndex
DROP INDEX "brands_name_key";

-- DropIndex
DROP INDEX "categories_name_key";

-- DropIndex
DROP INDEX "customers_customerCode_key";

-- DropIndex
DROP INDEX "customers_phone_key";

-- DropIndex
DROP INDEX "dispatches_dispatchNumber_key";

-- DropIndex
DROP INDEX "expense_categories_name_key";

-- DropIndex
DROP INDEX "expenses_expenseNumber_key";

-- DropIndex
DROP INDEX "external_rental_agreements_agreementNumber_key";

-- DropIndex
DROP INDEX "journal_entries_journalNumber_key";

-- DropIndex
DROP INDEX "maintenances_maintenanceNumber_key";

-- DropIndex
DROP INDEX "payments_paymentNumber_key";

-- DropIndex
DROP INDEX "product_attributes_name_key";

-- DropIndex
DROP INDEX "product_tags_name_key";

-- DropIndex
DROP INDEX "product_variants_sku_key";

-- DropIndex
DROP INDEX "products_productCode_key";

-- DropIndex
DROP INDEX "purchase_orders_poNumber_key";

-- DropIndex
DROP INDEX "rental_invoices_invoiceNumber_key";

-- DropIndex
DROP INDEX "rental_orders_orderNumber_key";

-- DropIndex
DROP INDEX "repairs_repairNumber_key";

-- DropIndex
DROP INDEX "return_inspections_returnNumber_key";

-- DropIndex
DROP INDEX "supplier_payments_paymentNumber_key";

-- DropIndex
DROP INDEX "suppliers_phone_key";

-- DropIndex
DROP INDEX "suppliers_supplierCode_key";

-- DropIndex
DROP INDEX "units_of_measure_code_key";

-- DropIndex
DROP INDEX "warehouses_warehouseCode_key";

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "asset_categories" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "asset_maintenance_history" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "asset_transfers" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "dispatch_items" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "dispatches" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "document_sequences" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "expense_categories" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "external_rental_agreement_items" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "external_rental_agreements" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "inventory_transactions" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "journal_entry_lines" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "maintenances" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "notification_recipients" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "product_attribute_values" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "product_attributes" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "product_specifications" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "product_tag_assignments" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "product_tags" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "rental_invoice_items" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "rental_invoices" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "rental_order_items" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "rental_orders" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "repair_items" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "repairs" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "return_inspection_items" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "return_inspections" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "supplier_payments" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "units_of_measure" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "user_dashboards" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "lastLoginAt",
DROP COLUMN "loginCount",
ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- AlterTable
ALTER TABLE "warehouses" ADD COLUMN     "organizationId" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- Seed the first organization: every existing row belongs to it.
-- Name comes from the active company settings when available.
INSERT INTO "organizations" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-4000-8000-000000000001',
  COALESCE(
    (SELECT NULLIF(TRIM("companyName"), '') FROM "company_settings" WHERE "isActive" = true ORDER BY "updatedAt" DESC LIMIT 1),
    'MT Service'
  ),
  'mt-service',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "accounts_organizationId_idx" ON "accounts"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_organizationId_accountCode_key" ON "accounts"("organizationId", "accountCode");

-- CreateIndex
CREATE INDEX "asset_categories_organizationId_idx" ON "asset_categories"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_organizationId_name_key" ON "asset_categories"("organizationId", "name");

-- CreateIndex
CREATE INDEX "asset_maintenance_history_organizationId_idx" ON "asset_maintenance_history"("organizationId");

-- CreateIndex
CREATE INDEX "asset_transfers_organizationId_idx" ON "asset_transfers"("organizationId");

-- CreateIndex
CREATE INDEX "assets_organizationId_idx" ON "assets"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "assets_organizationId_assetCode_key" ON "assets"("organizationId", "assetCode");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "brands_organizationId_idx" ON "brands"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "brands_organizationId_name_key" ON "brands"("organizationId", "name");

-- CreateIndex
CREATE INDEX "categories_organizationId_idx" ON "categories"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_organizationId_name_key" ON "categories"("organizationId", "name");

-- CreateIndex
CREATE INDEX "company_settings_organizationId_idx" ON "company_settings"("organizationId");

-- CreateIndex
CREATE INDEX "customers_organizationId_idx" ON "customers"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_organizationId_customerCode_key" ON "customers"("organizationId", "customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "customers_organizationId_phone_key" ON "customers"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "dispatch_items_organizationId_idx" ON "dispatch_items"("organizationId");

-- CreateIndex
CREATE INDEX "dispatches_organizationId_idx" ON "dispatches"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "dispatches_organizationId_dispatchNumber_key" ON "dispatches"("organizationId", "dispatchNumber");

-- CreateIndex
CREATE INDEX "document_sequences_organizationId_idx" ON "document_sequences"("organizationId");

-- CreateIndex
CREATE INDEX "expense_categories_organizationId_idx" ON "expense_categories"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_organizationId_name_key" ON "expense_categories"("organizationId", "name");

-- CreateIndex
CREATE INDEX "expenses_organizationId_idx" ON "expenses"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_organizationId_expenseNumber_key" ON "expenses"("organizationId", "expenseNumber");

-- CreateIndex
CREATE INDEX "external_rental_agreement_items_organizationId_idx" ON "external_rental_agreement_items"("organizationId");

-- CreateIndex
CREATE INDEX "external_rental_agreements_organizationId_idx" ON "external_rental_agreements"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "external_rental_agreements_organizationId_agreementNumber_key" ON "external_rental_agreements"("organizationId", "agreementNumber");

-- CreateIndex
CREATE INDEX "inventory_organizationId_idx" ON "inventory"("organizationId");

-- CreateIndex
CREATE INDEX "inventory_transactions_organizationId_idx" ON "inventory_transactions"("organizationId");

-- CreateIndex
CREATE INDEX "journal_entries_organizationId_idx" ON "journal_entries"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_organizationId_journalNumber_key" ON "journal_entries"("organizationId", "journalNumber");

-- CreateIndex
CREATE INDEX "journal_entry_lines_organizationId_idx" ON "journal_entry_lines"("organizationId");

-- CreateIndex
CREATE INDEX "maintenances_organizationId_idx" ON "maintenances"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "maintenances_organizationId_maintenanceNumber_key" ON "maintenances"("organizationId", "maintenanceNumber");

-- CreateIndex
CREATE INDEX "notification_recipients_organizationId_idx" ON "notification_recipients"("organizationId");

-- CreateIndex
CREATE INDEX "notifications_organizationId_idx" ON "notifications"("organizationId");

-- CreateIndex
CREATE INDEX "payments_organizationId_idx" ON "payments"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_organizationId_paymentNumber_key" ON "payments"("organizationId", "paymentNumber");

-- CreateIndex
CREATE INDEX "product_attribute_values_organizationId_idx" ON "product_attribute_values"("organizationId");

-- CreateIndex
CREATE INDEX "product_attributes_organizationId_idx" ON "product_attributes"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_attributes_organizationId_name_key" ON "product_attributes"("organizationId", "name");

-- CreateIndex
CREATE INDEX "product_images_organizationId_idx" ON "product_images"("organizationId");

-- CreateIndex
CREATE INDEX "product_specifications_organizationId_idx" ON "product_specifications"("organizationId");

-- CreateIndex
CREATE INDEX "product_tag_assignments_organizationId_idx" ON "product_tag_assignments"("organizationId");

-- CreateIndex
CREATE INDEX "product_tags_organizationId_idx" ON "product_tags"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_tags_organizationId_name_key" ON "product_tags"("organizationId", "name");

-- CreateIndex
CREATE INDEX "product_variants_organizationId_idx" ON "product_variants"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_organizationId_sku_key" ON "product_variants"("organizationId", "sku");

-- CreateIndex
CREATE INDEX "products_organizationId_idx" ON "products"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "products_organizationId_productCode_key" ON "products"("organizationId", "productCode");

-- CreateIndex
CREATE INDEX "purchase_order_items_organizationId_idx" ON "purchase_order_items"("organizationId");

-- CreateIndex
CREATE INDEX "purchase_orders_organizationId_idx" ON "purchase_orders"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_organizationId_poNumber_key" ON "purchase_orders"("organizationId", "poNumber");

-- CreateIndex
CREATE INDEX "rental_invoice_items_organizationId_idx" ON "rental_invoice_items"("organizationId");

-- CreateIndex
CREATE INDEX "rental_invoices_organizationId_idx" ON "rental_invoices"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "rental_invoices_organizationId_invoiceNumber_key" ON "rental_invoices"("organizationId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "rental_order_items_organizationId_idx" ON "rental_order_items"("organizationId");

-- CreateIndex
CREATE INDEX "rental_orders_organizationId_idx" ON "rental_orders"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "rental_orders_organizationId_orderNumber_key" ON "rental_orders"("organizationId", "orderNumber");

-- CreateIndex
CREATE INDEX "repair_items_organizationId_idx" ON "repair_items"("organizationId");

-- CreateIndex
CREATE INDEX "repairs_organizationId_idx" ON "repairs"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "repairs_organizationId_repairNumber_key" ON "repairs"("organizationId", "repairNumber");

-- CreateIndex
CREATE INDEX "return_inspection_items_organizationId_idx" ON "return_inspection_items"("organizationId");

-- CreateIndex
CREATE INDEX "return_inspections_organizationId_idx" ON "return_inspections"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "return_inspections_organizationId_returnNumber_key" ON "return_inspections"("organizationId", "returnNumber");

-- CreateIndex
CREATE INDEX "supplier_payments_organizationId_idx" ON "supplier_payments"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payments_organizationId_paymentNumber_key" ON "supplier_payments"("organizationId", "paymentNumber");

-- CreateIndex
CREATE INDEX "suppliers_organizationId_idx" ON "suppliers"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_organizationId_supplierCode_key" ON "suppliers"("organizationId", "supplierCode");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_organizationId_phone_key" ON "suppliers"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "units_of_measure_organizationId_idx" ON "units_of_measure"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "units_of_measure_organizationId_code_key" ON "units_of_measure"("organizationId", "code");

-- CreateIndex
CREATE INDEX "user_dashboards_organizationId_idx" ON "user_dashboards"("organizationId");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "warehouses_organizationId_idx" ON "warehouses"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_organizationId_warehouseCode_key" ON "warehouses"("organizationId", "warehouseCode");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units_of_measure" ADD CONSTRAINT "units_of_measure_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag_assignments" ADD CONSTRAINT "product_tag_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_order_items" ADD CONSTRAINT "rental_order_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_rental_agreements" ADD CONSTRAINT "external_rental_agreements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_rental_agreement_items" ADD CONSTRAINT "external_rental_agreement_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_inspections" ADD CONSTRAINT "return_inspections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_inspection_items" ADD CONSTRAINT "return_inspection_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_items" ADD CONSTRAINT "repair_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_invoices" ADD CONSTRAINT "rental_invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_invoice_items" ADD CONSTRAINT "rental_invoice_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance_history" ADD CONSTRAINT "asset_maintenance_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dashboards" ADD CONSTRAINT "user_dashboards_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

