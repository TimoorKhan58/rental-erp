-- Phase 18 RC1 performance indexes (additive only)

CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session"("userId");

CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account"("userId");
CREATE INDEX IF NOT EXISTS "account_userId_providerId_idx" ON "account"("userId", "providerId");

CREATE INDEX IF NOT EXISTS "purchase_orders_orderDate_idx" ON "purchase_orders"("orderDate");

CREATE INDEX IF NOT EXISTS "rental_orders_bookingDate_idx" ON "rental_orders"("bookingDate");
CREATE INDEX IF NOT EXISTS "rental_orders_createdAt_idx" ON "rental_orders"("createdAt");

CREATE INDEX IF NOT EXISTS "dispatch_items_rentalOrderItemId_idx" ON "dispatch_items"("rentalOrderItemId");

CREATE INDEX IF NOT EXISTS "return_inspection_items_returnInspectionId_idx" ON "return_inspection_items"("returnInspectionId");
CREATE INDEX IF NOT EXISTS "return_inspection_items_rentalOrderItemId_idx" ON "return_inspection_items"("rentalOrderItemId");

CREATE INDEX IF NOT EXISTS "inventory_transactions_createdById_idx" ON "inventory_transactions"("createdById");
CREATE INDEX IF NOT EXISTS "inventory_transactions_referenceType_referenceId_idx" ON "inventory_transactions"("referenceType", "referenceId");

CREATE INDEX IF NOT EXISTS "notification_recipients_notificationId_idx" ON "notification_recipients"("notificationId");
CREATE INDEX IF NOT EXISTS "notification_recipients_userId_isRead_idx" ON "notification_recipients"("userId", "isRead");
