export type DateRangeParams = {
  dateFrom?: string;
  dateTo?: string;
};

export type BalanceSheetParams = {
  asOfDate?: string;
};

export type BalanceSheetAccountLine = {
  accountId: string;
  accountCode: string;
  accountName: string;
  balance: number;
};

export type BalanceSheetSection = {
  accounts: BalanceSheetAccountLine[];
  total: number;
};

export type BalanceSheetResponse = {
  asOfDate: string | null;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netIncome: number;
  isBalanced: boolean;
};

export type ProfitLossAccountLine = {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
};

export type ProfitLossResponse = {
  dateFrom: string | null;
  dateTo: string | null;
  revenue: ProfitLossAccountLine[];
  expenses: ProfitLossAccountLine[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
};

export type CashFlowResponse = {
  dateFrom: string | null;
  dateTo: string | null;
  netIncome: number;
  adjustments: number;
  cashFromOperations: number;
  cashReceipts: number;
  cashPayments: number;
  netCashChange: number;
};

export type RevenueSummaryLine = {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
};

export type RevenueSummaryResponse = {
  dateFrom: string | null;
  dateTo: string | null;
  lines: RevenueSummaryLine[];
  totalRevenue: number;
};

export type ExpenseSummaryLine = {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
};

export type ExpenseSummaryResponse = {
  dateFrom: string | null;
  dateTo: string | null;
  lines: ExpenseSummaryLine[];
  totalExpenses: number;
};

export type RentalReportSortField =
  | "orderNumber"
  | "bookingDate"
  | "eventStartDate"
  | "status"
  | "grandTotal"
  | "createdAt";

export type RentalReportParams = {
  page?: number;
  pageSize?: number;
  sortBy?: RentalReportSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  warehouseId?: string;
  status?: string;
};

export type RentalReportLine = {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  status: string;
  bookingDate: string;
  eventStartDate: string;
  eventEndDate: string;
  expectedReturnDate: string;
  actualReturnDate: string | null;
  durationDays: number;
  grandTotal: number;
};

export type RentalReportResponse = {
  lines: RentalReportLine[];
  totalOrders: number;
  totalRevenue: number;
  averageDuration: number;
  statusCounts: Array<{ status: string; count: number }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type InventoryReportSortField =
  | "productCode"
  | "warehouseCode"
  | "quantityOnHand"
  | "availableQuantity"
  | "inventoryValue";

export type InventoryReportParams = {
  page?: number;
  pageSize?: number;
  sortBy?: InventoryReportSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: string;
  lowStockOnly?: boolean;
  overstockOnly?: boolean;
};

export type InventoryReportLine = {
  inventoryId: string;
  productId: string;
  productCode: string;
  productName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumStock: number;
  maximumStock: number | null;
  purchaseCost: number;
  inventoryValue: number;
  isLowStock: boolean;
  isOverstock: boolean;
  ageDays: number;
};

export type InventoryReportResponse = {
  lines: InventoryReportLine[];
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
  totalValue: number;
  lowStockCount: number;
  overstockCount: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CustomerReportSortField =
  | "customerCode"
  | "name"
  | "orderCount"
  | "revenue";

export type CustomerReportParams = {
  page?: number;
  pageSize?: number;
  sortBy?: CustomerReportSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
};

export type CustomerReportLine = {
  customerId: string;
  customerCode: string;
  customerName: string;
  orderCount: number;
  completedOrderCount: number;
  revenue: number;
  outstandingBalance: number;
  lastOrderDate: string | null;
};

export type CustomerReportResponse = {
  lines: CustomerReportLine[];
  totalCustomers: number;
  totalRevenue: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ReportHubCard = {
  title: string;
  description: string;
  href: string;
  category: "financial" | "operational";
};

export type ProductReportSortField =
  | "productCode"
  | "productName"
  | "rentalCount"
  | "rentedQuantity"
  | "quantityDays"
  | "revenue"
  | "rentalPricePerDay"
  | "quantityOnHand";

export type ProductReportParams = {
  page?: number;
  pageSize?: number;
  sortBy?: ProductReportSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ProductReportLine = {
  productId: string;
  productCode: string;
  productName: string;
  rentalPricePerDay: number;
  rentalCount: number;
  rentedQuantity: number;
  quantityDays: number;
  revenue: number;
  quantityOnHand: number;
  isRentable: boolean;
};

export type ProductReportResponse = {
  lines: ProductReportLine[];
  mostRented: ProductReportLine[];
  leastRented: ProductReportLine[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type OperationalReportListParams = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  warehouseId?: string;
  supplierId?: string;
};

export type SupplierReportLine = {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  purchaseOrderCount: number;
  purchaseTotal: number;
  lastOrderDate: string | null;
};

export type SupplierReportResponse = {
  lines: SupplierReportLine[];
  totalSuppliers: number;
  totalPurchaseValue: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type WarehouseReportLine = {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  inventoryQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  inventoryValue: number;
  productCount: number;
  utilizationPercent: number;
};

export type WarehouseReportResponse = {
  lines: WarehouseReportLine[];
  totalWarehouses: number;
  totalInventoryValue: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ProcurementReportLine = {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  status: string;
  orderDate: string;
  expectedDate: string | null;
  lineCount: number;
  purchaseTotal: number;
};

export type ProcurementReportResponse = {
  lines: ProcurementReportLine[];
  totalPurchaseOrders: number;
  totalPurchaseValue: number;
  supplierTotals: Array<{
    supplierId: string;
    supplierName: string;
    purchaseOrderCount: number;
    purchaseTotal: number;
  }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type DispatchReportLine = {
  id: string;
  dispatchNumber: string;
  rentalOrderId: string;
  orderNumber: string;
  status: string;
  dispatchDate: string;
  deliveryMethod: string | null;
  loadedAt: string | null;
  departedAt: string | null;
  deliveredAt: string | null;
  turnaroundHours: number | null;
};

export type DispatchReportResponse = {
  lines: DispatchReportLine[];
  pendingCount: number;
  completedCount: number;
  averageTurnaroundHours: number | null;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ReturnReportLine = {
  id: string;
  returnNumber: string;
  rentalOrderId: string;
  orderNumber: string;
  status: string;
  inspectionDate: string | null;
  receivedAt: string | null;
  completedAt: string | null;
  damagedQuantity: number;
  lostQuantity: number;
};

export type ReturnReportResponse = {
  lines: ReturnReportLine[];
  outstandingCount: number;
  completedCount: number;
  totalDamaged: number;
  totalLost: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type RepairReportLine = {
  id: string;
  repairNumber: string;
  productId: string;
  productName: string;
  warehouseId: string;
  status: string;
  repairDate: string;
  startedAt: string | null;
  completedAt: string | null;
  turnaroundDays: number | null;
  estimatedCost: number | null;
  actualCost: number | null;
};

export type RepairReportResponse = {
  lines: RepairReportLine[];
  statusCounts: Array<{ status: string; count: number }>;
  averageTurnaroundDays: number | null;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type MaintenanceReportLine = {
  id: string;
  maintenanceNumber: string;
  productId: string;
  productName: string;
  warehouseId: string;
  status: string;
  serviceType: string | null;
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
};

export type MaintenanceReportResponse = {
  lines: MaintenanceReportLine[];
  upcomingCount: number;
  completedCount: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CsvColumn<T> = {
  key: keyof T | string;
  header: string;
  value?: (row: T) => string | number | null | undefined;
};
