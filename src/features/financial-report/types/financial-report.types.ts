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
