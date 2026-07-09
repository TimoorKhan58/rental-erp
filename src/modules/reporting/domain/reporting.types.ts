export interface DashboardSummary {
  totalCustomers: number;
  totalSuppliers: number;
  totalProducts: number;
  totalWarehouses: number;
  inventoryValue: number;
  inventoryQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  rentalOrders: number;
  confirmedOrders: number;
  reservedOrders: number;
  completedRentals: number;
  dispatchesReady: number;
  dispatchesInProgress: number;
  pendingReturns: number;
  repairsPending: number;
  repairsInProgress: number;
  maintenanceScheduled: number;
  maintenanceInProgress: number;
  openPurchaseOrders: number;
  completedPurchaseOrders: number;
  outstandingInvoices: number;
  paidInvoices: number;
  revenueThisMonth: number;
  paymentsThisMonth: number;
  averageRentalDuration: number;
}

export interface InventoryReportLine {
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
}

export interface InventoryReport {
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
}

export interface RentalReportLine {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  status: string;
  bookingDate: Date;
  eventStartDate: Date;
  eventEndDate: Date;
  expectedReturnDate: Date;
  actualReturnDate: Date | null;
  durationDays: number;
  grandTotal: number;
}

export interface RentalReport {
  lines: RentalReportLine[];
  totalOrders: number;
  totalRevenue: number;
  averageDuration: number;
  statusCounts: Array<{ status: string; count: number }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DispatchReportLine {
  id: string;
  dispatchNumber: string;
  rentalOrderId: string;
  orderNumber: string;
  status: string;
  dispatchDate: Date;
  deliveryMethod: string;
  loadedAt: Date | null;
  departedAt: Date | null;
  deliveredAt: Date | null;
  turnaroundHours: number | null;
}

export interface DispatchReport {
  lines: DispatchReportLine[];
  pendingCount: number;
  completedCount: number;
  averageTurnaroundHours: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ReturnReportLine {
  id: string;
  returnNumber: string;
  rentalOrderId: string;
  orderNumber: string;
  status: string;
  inspectionDate: Date;
  receivedAt: Date | null;
  completedAt: Date | null;
  damagedQuantity: number;
  lostQuantity: number;
}

export interface ReturnReport {
  lines: ReturnReportLine[];
  outstandingCount: number;
  completedCount: number;
  totalDamaged: number;
  totalLost: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RepairReportLine {
  id: string;
  repairNumber: string;
  productId: string;
  productName: string;
  warehouseId: string;
  status: string;
  repairDate: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  turnaroundDays: number | null;
  estimatedCost: number;
  actualCost: number | null;
}

export interface RepairReport {
  lines: RepairReportLine[];
  statusCounts: Array<{ status: string; count: number }>;
  averageTurnaroundDays: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MaintenanceReportLine {
  id: string;
  maintenanceNumber: string;
  productId: string;
  productName: string;
  warehouseId: string;
  status: string;
  serviceType: string;
  scheduledDate: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  estimatedCost: number;
  actualCost: number | null;
}

export interface MaintenanceReport {
  lines: MaintenanceReportLine[];
  upcomingCount: number;
  completedCount: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProcurementReportLine {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  status: string;
  orderDate: Date;
  expectedDate: Date | null;
  lineCount: number;
  purchaseTotal: number;
}

export interface ProcurementReport {
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
}

export interface CustomerReportLine {
  customerId: string;
  customerCode: string;
  customerName: string;
  orderCount: number;
  completedOrderCount: number;
  revenue: number;
  outstandingBalance: number;
  lastOrderDate: Date | null;
}

export interface CustomerReport {
  lines: CustomerReportLine[];
  totalCustomers: number;
  totalRevenue: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SupplierReportLine {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  purchaseOrderCount: number;
  purchaseTotal: number;
  lastOrderDate: Date | null;
}

export interface SupplierReport {
  lines: SupplierReportLine[];
  totalSuppliers: number;
  totalPurchaseValue: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface WarehouseReportLine {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  inventoryQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  inventoryValue: number;
  productCount: number;
  utilizationPercent: number;
}

export interface WarehouseReport {
  lines: WarehouseReportLine[];
  totalWarehouses: number;
  totalInventoryValue: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProductReportLine {
  productId: string;
  productCode: string;
  productName: string;
  rentalCount: number;
  rentedQuantity: number;
  revenue: number;
  quantityOnHand: number;
  isRentable: boolean;
}

export interface ProductReport {
  lines: ProductReportLine[];
  mostRented: ProductReportLine[];
  leastRented: ProductReportLine[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
