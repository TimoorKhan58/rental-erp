-- CreateEnum
CREATE TYPE "WidgetType" AS ENUM ('KPI', 'CHART', 'TABLE', 'LIST', 'CALENDAR', 'METRIC', 'CUSTOM');

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
CREATE UNIQUE INDEX "dashboards_code_key" ON "dashboards"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_widgets_dashboardId_widgetKey_key" ON "dashboard_widgets"("dashboardId", "widgetKey");

-- CreateIndex
CREATE INDEX "dashboard_widgets_dashboardId_idx" ON "dashboard_widgets"("dashboardId");

-- CreateIndex
CREATE INDEX "dashboard_widgets_widgetKey_idx" ON "dashboard_widgets"("widgetKey");

-- CreateIndex
CREATE INDEX "dashboard_widgets_visible_idx" ON "dashboard_widgets"("visible");

-- CreateIndex
CREATE UNIQUE INDEX "user_dashboards_userId_dashboardId_key" ON "user_dashboards"("userId", "dashboardId");

-- CreateIndex
CREATE INDEX "user_dashboards_userId_idx" ON "user_dashboards"("userId");

-- CreateIndex
CREATE INDEX "user_dashboards_dashboardId_idx" ON "user_dashboards"("dashboardId");

-- CreateIndex
CREATE INDEX "user_dashboards_isFavorite_idx" ON "user_dashboards"("isFavorite");

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dashboards" ADD CONSTRAINT "user_dashboards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dashboards" ADD CONSTRAINT "user_dashboards_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "dashboards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default dashboard
INSERT INTO "dashboards" (
    "id", "name", "code", "description", "isDefault", "enabled", "createdAt", "updatedAt"
) VALUES (
    'db000001-0000-4000-8000-000000000001',
    'Overview',
    'overview',
    'Default operational dashboard layout',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Seed default dashboard widgets
INSERT INTO "dashboard_widgets" (
    "id", "dashboardId", "widgetKey", "title", "widgetType", "configuration",
    "row", "column", "width", "height", "refreshIntervalSeconds", "visible",
    "createdAt", "updatedAt"
) VALUES
    ('dw000001-0000-4000-8000-000000000001', 'db000001-0000-4000-8000-000000000001', 'summary-kpis', 'Summary KPIs', 'KPI', '{}', 0, 0, 12, 2, 300, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dw000001-0000-4000-8000-000000000002', 'db000001-0000-4000-8000-000000000001', 'rental-orders-overview', 'Rental Orders', 'TABLE', '{}', 2, 0, 6, 4, 300, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dw000001-0000-4000-8000-000000000003', 'db000001-0000-4000-8000-000000000001', 'inventory-status', 'Inventory Status', 'KPI', '{}', 2, 6, 6, 4, 300, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dw000001-0000-4000-8000-000000000004', 'db000001-0000-4000-8000-000000000001', 'dispatch-queue', 'Dispatch Queue', 'LIST', '{}', 6, 0, 4, 3, 300, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dw000001-0000-4000-8000-000000000005', 'db000001-0000-4000-8000-000000000001', 'returns-pending', 'Pending Returns', 'LIST', '{}', 6, 4, 4, 3, 300, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dw000001-0000-4000-8000-000000000006', 'db000001-0000-4000-8000-000000000001', 'revenue-summary', 'Revenue Summary', 'METRIC', '{}', 6, 8, 4, 3, 300, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dw000001-0000-4000-8000-000000000007', 'db000001-0000-4000-8000-000000000001', 'expense-summary', 'Expense Summary', 'METRIC', '{}', 9, 0, 6, 3, 300, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dw000001-0000-4000-8000-000000000008', 'db000001-0000-4000-8000-000000000001', 'recent-payments', 'Recent Payments', 'TABLE', '{}', 9, 6, 6, 3, 300, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
