-- Accounting now also posts purchases, supplier payments and hire-ins
-- (2026-11-19 accounting audit). New kinds of journal source.
ALTER TYPE "JournalReferenceType" ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER';
ALTER TYPE "JournalReferenceType" ADD VALUE IF NOT EXISTS 'SUPPLIER_PAYMENT';
ALTER TYPE "JournalReferenceType" ADD VALUE IF NOT EXISTS 'EXTERNAL_RENTAL';
