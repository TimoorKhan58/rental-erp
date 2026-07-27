-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AttributeDataType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'RESERVE', 'RELEASE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RentalOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'RESERVED', 'DISPATCHED', 'ON_RENT', 'PARTIALLY_RETURNED', 'RETURNED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('DELIVERY', 'CUSTOMER_PICKUP');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('DRAFT', 'READY', 'DISPATCHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('DRAFT', 'RECEIVED', 'INSPECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "RepairType" AS ENUM ('CLEANING', 'WELDING', 'STITCHING', 'PAINTING', 'FRAME_REPAIR', 'FABRIC_REPAIR', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceServiceType" AS ENUM ('PREVENTIVE', 'CLEANING', 'INSPECTION', 'CALIBRATION', 'LUBRICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "RentalInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "RentalInvoiceLineType" AS ENUM ('RENTAL_CHARGE', 'DELIVERY_CHARGE', 'PICKUP_CHARGE', 'DAMAGE_CHARGE', 'LOST_ITEM_CHARGE', 'REPAIR_CHARGE', 'LABOUR_CHARGE', 'MANUAL_CHARGE', 'DISCOUNT', 'TAX');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'ONLINE', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "JournalReferenceType" AS ENUM ('RENTAL_INVOICE', 'PAYMENT', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('VENDOR', 'MANUAL');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RENTAL_ORDER', 'PAYMENT', 'DISPATCH', 'EXPENSE', 'REPAIR', 'CUSTOMER', 'PRODUCT', 'SUPPLIER', 'WAREHOUSE', 'PURCHASE_ORDER', 'RETURN', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "BackupFrequency" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'APPROVE', 'REJECT', 'CANCEL', 'DISPATCH', 'RETURN', 'PAYMENT_RECEIVED', 'EXPENSE_RECORDED', 'EXPORT', 'IMPORT', 'PRINT');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAILED', 'WARNING');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'UNDER_MAINTENANCE', 'TRANSFERRED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "WidgetType" AS ENUM ('KPI', 'CHART', 'TABLE', 'LIST', 'CALENDAR', 'METRIC', 'CUSTOM');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "erpUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "customerCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "cnic" TEXT,
    "address" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL,
    "warehouseCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units_of_measure" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_of_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "dataType" "AttributeDataType" NOT NULL DEFAULT 'TEXT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tags" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tag_assignments" (
    "productId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_tag_assignments_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_specifications" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_values" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "attributeId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "productCode" TEXT NOT NULL,
    "categoryId" UUID,
    "brandId" UUID,
    "unitId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "purchaseCost" DECIMAL(12,2) NOT NULL,
    "rentalPricePerDay" DECIMAL(12,2) NOT NULL,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "minimumStock" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "isRentable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "quantityOnHand" INTEGER NOT NULL,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "minimumStock" INTEGER NOT NULL DEFAULT 0,
    "maximumStock" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" UUID NOT NULL,
    "inventoryId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL,
    "expectedDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_orders" (
    "id" UUID NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "status" "RentalOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "bookingDate" DATE NOT NULL,
    "eventStartDate" DATE NOT NULL,
    "eventEndDate" DATE NOT NULL,
    "expectedReturnDate" DATE NOT NULL,
    "actualReturnDate" DATE,
    "deliveryRequired" BOOLEAN NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryCharges" DECIMAL(12,2) NOT NULL,
    "labourCharges" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "grandTotal" DECIMAL(12,2) NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_order_items" (
    "id" UUID NOT NULL,
    "rentalOrderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "rentalPricePerDay" DECIMAL(12,2) NOT NULL,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "eventStartDate" DATE NOT NULL,
    "eventEndDate" DATE NOT NULL,
    "numberOfDays" INTEGER NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "rental_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatches" (
    "id" UUID NOT NULL,
    "dispatchNumber" TEXT NOT NULL,
    "rentalOrderId" UUID NOT NULL,
    "dispatchDate" TIMESTAMP(3) NOT NULL,
    "deliveryMethod" "DeliveryMethod" NOT NULL,
    "vehicleNumber" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "deliveryAddress" TEXT NOT NULL,
    "remarks" TEXT,
    "status" "DispatchStatus" NOT NULL DEFAULT 'DRAFT',
    "loadedAt" TIMESTAMP(3),
    "departedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_items" (
    "id" UUID NOT NULL,
    "dispatchId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "rentalOrderItemId" UUID,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "dispatch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_inspections" (
    "id" UUID NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "rentalOrderId" UUID NOT NULL,
    "dispatchId" UUID NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "inspectedById" UUID NOT NULL,
    "remarks" TEXT,
    "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "receivedAt" TIMESTAMP(3),
    "inspectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_inspection_items" (
    "id" UUID NOT NULL,
    "returnInspectionId" UUID NOT NULL,
    "rentalOrderItemId" UUID NOT NULL,
    "returnedQuantity" INTEGER NOT NULL,
    "goodQuantity" INTEGER NOT NULL,
    "brokenQuantity" INTEGER NOT NULL,
    "repairQuantity" INTEGER NOT NULL,
    "lostQuantity" INTEGER NOT NULL,
    "missingQuantity" INTEGER NOT NULL,
    "damageCharge" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "return_inspection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repairs" (
    "id" UUID NOT NULL,
    "repairNumber" TEXT NOT NULL,
    "returnInspectionId" UUID NOT NULL,
    "returnInspectionItemId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "repairDate" TIMESTAMP(3) NOT NULL,
    "assignedTo" TEXT,
    "estimatedCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "RepairStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_items" (
    "id" UUID NOT NULL,
    "repairId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "repairType" "RepairType" NOT NULL,
    "repairCost" DECIMAL(12,2) NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "repair_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenances" (
    "id" UUID NOT NULL,
    "maintenanceNumber" TEXT NOT NULL,
    "productId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "inventoryId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "serviceType" "MaintenanceServiceType" NOT NULL,
    "technician" TEXT,
    "vendor" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "estimatedCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_invoices" (
    "id" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "rentalOrderId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "dueDate" DATE,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL,
    "grandTotal" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL,
    "status" "RentalInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_invoice_items" (
    "id" UUID NOT NULL,
    "rentalInvoiceId" UUID NOT NULL,
    "lineType" "RentalInvoiceLineType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "productName" TEXT,
    "dailyRate" DECIMAL(12,2),
    "numberOfDays" INTEGER,
    "damagedQuantity" INTEGER NOT NULL DEFAULT 0,
    "lostQuantity" INTEGER NOT NULL DEFAULT 0,
    "missingQuantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "rental_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "rentalInvoiceId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "postedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "accountCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL,
    "journalNumber" TEXT NOT NULL,
    "journalDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "referenceType" "JournalReferenceType",
    "referenceId" UUID,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "postedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "postedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_lines" (
    "id" UUID NOT NULL,
    "journalEntryId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "memo" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "journal_entry_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "categoryId" UUID NOT NULL,
    "expenseType" "ExpenseType" NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "supplierId" UUID,
    "vendorName" TEXT,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "attachmentRef" TEXT,
    "referenceNumber" TEXT,
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "journalEntryId" UUID,
    "recordedById" UUID NOT NULL,
    "approvedById" UUID,
    "paidById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "module" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "status" "AuditStatus" NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "httpMethod" TEXT,
    "route" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "templateId" UUID,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "module" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipients" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "userId" UUID,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "recipientWhatsApp" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "serialNumber" TEXT,
    "purchaseDate" DATE NOT NULL,
    "purchaseCost" DECIMAL(12,2) NOT NULL,
    "residualValue" DECIMAL(12,2) NOT NULL,
    "usefulLifeMonths" INTEGER NOT NULL,
    "currentBookValue" DECIMAL(12,2) NOT NULL,
    "warehouseId" UUID NOT NULL,
    "assignedEmployeeId" UUID,
    "vendorId" UUID,
    "notes" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "disposalDate" DATE,
    "disposalAmount" DECIMAL(12,2),
    "disposalReason" TEXT,
    "disposedById" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_transfers" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "fromWarehouseId" UUID NOT NULL,
    "toWarehouseId" UUID NOT NULL,
    "transferDate" DATE NOT NULL,
    "reason" TEXT,
    "transferredById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_maintenance_history" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "serviceDate" DATE NOT NULL,
    "vendor" TEXT,
    "cost" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "completedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_maintenance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboards" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" UUID NOT NULL,
    "dashboardId" UUID NOT NULL,
    "widgetKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "widgetType" "WidgetType" NOT NULL,
    "configuration" JSONB NOT NULL,
    "row" INTEGER NOT NULL,
    "column" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "refreshIntervalSeconds" INTEGER,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_dashboards" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "dashboardId" UUID NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "customLayout" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_erpUserId_key" ON "user"("erpUserId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

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
CREATE UNIQUE INDEX "customers_customerCode_key" ON "customers"("customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_isActive_idx" ON "customers"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplierCode_key" ON "suppliers"("supplierCode");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_phone_key" ON "suppliers"("phone");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "suppliers_isActive_idx" ON "suppliers"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_warehouseCode_key" ON "warehouses"("warehouseCode");

-- CreateIndex
CREATE INDEX "warehouses_name_idx" ON "warehouses"("name");

-- CreateIndex
CREATE INDEX "warehouses_isActive_idx" ON "warehouses"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE INDEX "brands_isActive_idx" ON "brands"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "units_of_measure_code_key" ON "units_of_measure"("code");

-- CreateIndex
CREATE INDEX "units_of_measure_isActive_idx" ON "units_of_measure"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "product_attributes_name_key" ON "product_attributes"("name");

-- CreateIndex
CREATE INDEX "product_attributes_isActive_idx" ON "product_attributes"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "product_tags_name_key" ON "product_tags"("name");

-- CreateIndex
CREATE INDEX "product_tags_isActive_idx" ON "product_tags"("isActive");

-- CreateIndex
CREATE INDEX "product_tag_assignments_tagId_idx" ON "product_tag_assignments"("tagId");

-- CreateIndex
CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");

-- CreateIndex
CREATE INDEX "product_specifications_productId_idx" ON "product_specifications"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_specifications_productId_key_key" ON "product_specifications"("productId", "key");

-- CreateIndex
CREATE INDEX "product_attribute_values_attributeId_idx" ON "product_attribute_values"("attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "product_attribute_values_productId_attributeId_key" ON "product_attribute_values"("productId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "products_productCode_key" ON "products"("productCode");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_brandId_idx" ON "products"("brandId");

-- CreateIndex
CREATE INDEX "products_unitId_idx" ON "products"("unitId");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_productCode_idx" ON "products"("productCode");

-- CreateIndex
CREATE INDEX "products_isActive_idx" ON "products"("isActive");

-- CreateIndex
CREATE INDEX "inventory_productId_idx" ON "inventory"("productId");

-- CreateIndex
CREATE INDEX "inventory_warehouseId_idx" ON "inventory"("warehouseId");

-- CreateIndex
CREATE INDEX "inventory_isActive_idx" ON "inventory"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_productId_warehouseId_key" ON "inventory"("productId", "warehouseId");

-- CreateIndex
CREATE INDEX "inventory_transactions_inventoryId_idx" ON "inventory_transactions"("inventoryId");

-- CreateIndex
CREATE INDEX "inventory_transactions_productId_idx" ON "inventory_transactions"("productId");

-- CreateIndex
CREATE INDEX "inventory_transactions_warehouseId_idx" ON "inventory_transactions"("warehouseId");

-- CreateIndex
CREATE INDEX "inventory_transactions_movementType_idx" ON "inventory_transactions"("movementType");

-- CreateIndex
CREATE INDEX "inventory_transactions_createdAt_idx" ON "inventory_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON "purchase_orders"("poNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_orders_warehouseId_idx" ON "purchase_orders"("warehouseId");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchaseOrderId_idx" ON "purchase_order_items"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_items_productId_idx" ON "purchase_order_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "rental_orders_orderNumber_key" ON "rental_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "rental_orders_customerId_idx" ON "rental_orders"("customerId");

-- CreateIndex
CREATE INDEX "rental_orders_warehouseId_idx" ON "rental_orders"("warehouseId");

-- CreateIndex
CREATE INDEX "rental_orders_status_idx" ON "rental_orders"("status");

-- CreateIndex
CREATE INDEX "rental_orders_customerId_status_idx" ON "rental_orders"("customerId", "status");

-- CreateIndex
CREATE INDEX "rental_orders_eventStartDate_idx" ON "rental_orders"("eventStartDate");

-- CreateIndex
CREATE INDEX "rental_orders_eventEndDate_idx" ON "rental_orders"("eventEndDate");

-- CreateIndex
CREATE INDEX "rental_order_items_rentalOrderId_idx" ON "rental_order_items"("rentalOrderId");

-- CreateIndex
CREATE INDEX "rental_order_items_productId_idx" ON "rental_order_items"("productId");

-- CreateIndex
CREATE INDEX "rental_order_items_eventStartDate_idx" ON "rental_order_items"("eventStartDate");

-- CreateIndex
CREATE INDEX "rental_order_items_eventEndDate_idx" ON "rental_order_items"("eventEndDate");

-- CreateIndex
CREATE UNIQUE INDEX "dispatches_dispatchNumber_key" ON "dispatches"("dispatchNumber");

-- CreateIndex
CREATE INDEX "dispatches_rentalOrderId_idx" ON "dispatches"("rentalOrderId");

-- CreateIndex
CREATE INDEX "dispatches_dispatchDate_idx" ON "dispatches"("dispatchDate");

-- CreateIndex
CREATE INDEX "dispatches_status_idx" ON "dispatches"("status");

-- CreateIndex
CREATE INDEX "dispatch_items_dispatchId_idx" ON "dispatch_items"("dispatchId");

-- CreateIndex
CREATE INDEX "dispatch_items_productId_idx" ON "dispatch_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "return_inspections_returnNumber_key" ON "return_inspections"("returnNumber");

-- CreateIndex
CREATE INDEX "return_inspections_rentalOrderId_idx" ON "return_inspections"("rentalOrderId");

-- CreateIndex
CREATE INDEX "return_inspections_dispatchId_idx" ON "return_inspections"("dispatchId");

-- CreateIndex
CREATE INDEX "return_inspections_inspectionDate_idx" ON "return_inspections"("inspectionDate");

-- CreateIndex
CREATE INDEX "return_inspections_status_idx" ON "return_inspections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "repairs_repairNumber_key" ON "repairs"("repairNumber");

-- CreateIndex
CREATE INDEX "repairs_repairDate_idx" ON "repairs"("repairDate");

-- CreateIndex
CREATE INDEX "repairs_status_idx" ON "repairs"("status");

-- CreateIndex
CREATE INDEX "repairs_returnInspectionId_idx" ON "repairs"("returnInspectionId");

-- CreateIndex
CREATE INDEX "repairs_returnInspectionItemId_idx" ON "repairs"("returnInspectionItemId");

-- CreateIndex
CREATE INDEX "repairs_productId_idx" ON "repairs"("productId");

-- CreateIndex
CREATE INDEX "repairs_warehouseId_idx" ON "repairs"("warehouseId");

-- CreateIndex
CREATE INDEX "repair_items_repairId_idx" ON "repair_items"("repairId");

-- CreateIndex
CREATE INDEX "repair_items_productId_idx" ON "repair_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "maintenances_maintenanceNumber_key" ON "maintenances"("maintenanceNumber");

-- CreateIndex
CREATE INDEX "maintenances_maintenanceNumber_idx" ON "maintenances"("maintenanceNumber");

-- CreateIndex
CREATE INDEX "maintenances_productId_idx" ON "maintenances"("productId");

-- CreateIndex
CREATE INDEX "maintenances_warehouseId_idx" ON "maintenances"("warehouseId");

-- CreateIndex
CREATE INDEX "maintenances_inventoryId_idx" ON "maintenances"("inventoryId");

-- CreateIndex
CREATE INDEX "maintenances_scheduledDate_idx" ON "maintenances"("scheduledDate");

-- CreateIndex
CREATE INDEX "maintenances_status_idx" ON "maintenances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rental_invoices_invoiceNumber_key" ON "rental_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "rental_invoices_invoiceNumber_idx" ON "rental_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "rental_invoices_rentalOrderId_idx" ON "rental_invoices"("rentalOrderId");

-- CreateIndex
CREATE INDEX "rental_invoices_customerId_idx" ON "rental_invoices"("customerId");

-- CreateIndex
CREATE INDEX "rental_invoices_invoiceDate_idx" ON "rental_invoices"("invoiceDate");

-- CreateIndex
CREATE INDEX "rental_invoices_status_idx" ON "rental_invoices"("status");

-- CreateIndex
CREATE INDEX "rental_invoices_customerId_status_idx" ON "rental_invoices"("customerId", "status");

-- CreateIndex
CREATE INDEX "rental_invoice_items_rentalInvoiceId_idx" ON "rental_invoice_items"("rentalInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentNumber_key" ON "payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "payments_paymentNumber_idx" ON "payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "payments_paymentDate_idx" ON "payments"("paymentDate");

-- CreateIndex
CREATE INDEX "payments_paymentMethod_idx" ON "payments"("paymentMethod");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_rentalInvoiceId_idx" ON "payments"("rentalInvoiceId");

-- CreateIndex
CREATE INDEX "payments_customerId_idx" ON "payments"("customerId");

-- CreateIndex
CREATE INDEX "payments_rentalInvoiceId_paymentDate_idx" ON "payments"("rentalInvoiceId", "paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_accountCode_key" ON "accounts"("accountCode");

-- CreateIndex
CREATE INDEX "accounts_accountCode_idx" ON "accounts"("accountCode");

-- CreateIndex
CREATE INDEX "accounts_accountType_idx" ON "accounts"("accountType");

-- CreateIndex
CREATE INDEX "accounts_isActive_idx" ON "accounts"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_journalNumber_key" ON "journal_entries"("journalNumber");

-- CreateIndex
CREATE INDEX "journal_entries_journalNumber_idx" ON "journal_entries"("journalNumber");

-- CreateIndex
CREATE INDEX "journal_entries_journalDate_idx" ON "journal_entries"("journalDate");

-- CreateIndex
CREATE INDEX "journal_entries_status_idx" ON "journal_entries"("status");

-- CreateIndex
CREATE INDEX "journal_entries_referenceType_referenceId_idx" ON "journal_entries"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "journal_entry_lines_journalEntryId_idx" ON "journal_entry_lines"("journalEntryId");

-- CreateIndex
CREATE INDEX "journal_entry_lines_accountId_idx" ON "journal_entry_lines"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE INDEX "expense_categories_isActive_idx" ON "expense_categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_expenseNumber_key" ON "expenses"("expenseNumber");

-- CreateIndex
CREATE INDEX "expenses_expenseDate_idx" ON "expenses"("expenseDate");

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "expenses"("status");

-- CreateIndex
CREATE INDEX "expenses_categoryId_idx" ON "expenses"("categoryId");

-- CreateIndex
CREATE INDEX "expenses_supplierId_idx" ON "expenses"("supplierId");

-- CreateIndex
CREATE INDEX "expenses_expenseDate_status_idx" ON "expenses"("expenseDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_companySettingId_documentType_key" ON "document_sequences"("companySettingId", "documentType");

-- CreateIndex
CREATE INDEX "feature_flags_featureKey_idx" ON "feature_flags"("featureKey");

-- CreateIndex
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_systemSettingId_featureKey_key" ON "feature_flags"("systemSettingId", "featureKey");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");

-- CreateIndex
CREATE INDEX "audit_logs_entityName_idx" ON "audit_logs"("entityName");

-- CreateIndex
CREATE INDEX "audit_logs_recordId_idx" ON "audit_logs"("recordId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_status_idx" ON "audit_logs"("status");

-- CreateIndex
CREATE INDEX "audit_logs_requestId_idx" ON "audit_logs"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_eventKey_key" ON "notification_templates"("eventKey");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_channel_idx" ON "notifications"("channel");

-- CreateIndex
CREATE INDEX "notifications_scheduledAt_idx" ON "notifications"("scheduledAt");

-- CreateIndex
CREATE INDEX "notifications_sentAt_idx" ON "notifications"("sentAt");

-- CreateIndex
CREATE INDEX "notifications_module_idx" ON "notifications"("module");

-- CreateIndex
CREATE INDEX "notifications_entityName_idx" ON "notifications"("entityName");

-- CreateIndex
CREATE INDEX "notifications_recordId_idx" ON "notifications"("recordId");

-- CreateIndex
CREATE INDEX "notification_recipients_userId_idx" ON "notification_recipients"("userId");

-- CreateIndex
CREATE INDEX "notification_recipients_isRead_idx" ON "notification_recipients"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_name_key" ON "asset_categories"("name");

-- CreateIndex
CREATE INDEX "asset_categories_isActive_idx" ON "asset_categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "assets_assetCode_key" ON "assets"("assetCode");

-- CreateIndex
CREATE INDEX "assets_categoryId_idx" ON "assets"("categoryId");

-- CreateIndex
CREATE INDEX "assets_warehouseId_idx" ON "assets"("warehouseId");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_assetCode_idx" ON "assets"("assetCode");

-- CreateIndex
CREATE INDEX "assets_name_idx" ON "assets"("name");

-- CreateIndex
CREATE INDEX "asset_transfers_assetId_idx" ON "asset_transfers"("assetId");

-- CreateIndex
CREATE INDEX "asset_transfers_transferDate_idx" ON "asset_transfers"("transferDate");

-- CreateIndex
CREATE INDEX "asset_maintenance_history_assetId_idx" ON "asset_maintenance_history"("assetId");

-- CreateIndex
CREATE INDEX "asset_maintenance_history_serviceDate_idx" ON "asset_maintenance_history"("serviceDate");

-- CreateIndex
CREATE UNIQUE INDEX "dashboards_code_key" ON "dashboards"("code");

-- CreateIndex
CREATE INDEX "dashboard_widgets_dashboardId_idx" ON "dashboard_widgets"("dashboardId");

-- CreateIndex
CREATE INDEX "dashboard_widgets_widgetKey_idx" ON "dashboard_widgets"("widgetKey");

-- CreateIndex
CREATE INDEX "dashboard_widgets_visible_idx" ON "dashboard_widgets"("visible");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_widgets_dashboardId_widgetKey_key" ON "dashboard_widgets"("dashboardId", "widgetKey");

-- CreateIndex
CREATE INDEX "user_dashboards_userId_idx" ON "user_dashboards"("userId");

-- CreateIndex
CREATE INDEX "user_dashboards_dashboardId_idx" ON "user_dashboards"("dashboardId");

-- CreateIndex
CREATE INDEX "user_dashboards_isFavorite_idx" ON "user_dashboards"("isFavorite");

-- CreateIndex
CREATE UNIQUE INDEX "user_dashboards_userId_dashboardId_key" ON "user_dashboards"("userId", "dashboardId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_erpUserId_fkey" FOREIGN KEY ("erpUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_authUserId_fkey" FOREIGN KEY ("authUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag_assignments" ADD CONSTRAINT "product_tag_assignments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag_assignments" ADD CONSTRAINT "product_tag_assignments_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "product_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "product_attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_order_items" ADD CONSTRAINT "rental_order_items_rentalOrderId_fkey" FOREIGN KEY ("rentalOrderId") REFERENCES "rental_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_order_items" ADD CONSTRAINT "rental_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_rentalOrderId_fkey" FOREIGN KEY ("rentalOrderId") REFERENCES "rental_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "dispatches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_rentalOrderItemId_fkey" FOREIGN KEY ("rentalOrderItemId") REFERENCES "rental_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_inspections" ADD CONSTRAINT "return_inspections_rentalOrderId_fkey" FOREIGN KEY ("rentalOrderId") REFERENCES "rental_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_inspections" ADD CONSTRAINT "return_inspections_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "dispatches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_inspections" ADD CONSTRAINT "return_inspections_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_inspection_items" ADD CONSTRAINT "return_inspection_items_returnInspectionId_fkey" FOREIGN KEY ("returnInspectionId") REFERENCES "return_inspections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_inspection_items" ADD CONSTRAINT "return_inspection_items_rentalOrderItemId_fkey" FOREIGN KEY ("rentalOrderItemId") REFERENCES "rental_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_returnInspectionId_fkey" FOREIGN KEY ("returnInspectionId") REFERENCES "return_inspections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_items" ADD CONSTRAINT "repair_items_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "repairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_items" ADD CONSTRAINT "repair_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_invoices" ADD CONSTRAINT "rental_invoices_rentalOrderId_fkey" FOREIGN KEY ("rentalOrderId") REFERENCES "rental_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_invoices" ADD CONSTRAINT "rental_invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_invoices" ADD CONSTRAINT "rental_invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_invoice_items" ADD CONSTRAINT "rental_invoice_items_rentalInvoiceId_fkey" FOREIGN KEY ("rentalInvoiceId") REFERENCES "rental_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_rentalInvoiceId_fkey" FOREIGN KEY ("rentalInvoiceId") REFERENCES "rental_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_companySettingId_fkey" FOREIGN KEY ("companySettingId") REFERENCES "company_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_systemSettingId_fkey" FOREIGN KEY ("systemSettingId") REFERENCES "system_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_disposedById_fkey" FOREIGN KEY ("disposedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_transferredById_fkey" FOREIGN KEY ("transferredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance_history" ADD CONSTRAINT "asset_maintenance_history_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance_history" ADD CONSTRAINT "asset_maintenance_history_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dashboards" ADD CONSTRAINT "user_dashboards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dashboards" ADD CONSTRAINT "user_dashboards_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "dashboards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
