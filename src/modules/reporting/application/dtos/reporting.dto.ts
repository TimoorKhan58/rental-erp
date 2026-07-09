export interface DashboardSummaryDto {
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

export interface InventoryReportLineDto {
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

export interface InventoryReportDto {
  lines: InventoryReportLineDto[];
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

export interface RentalReportLineDto {
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
}

export interface RentalReportDto {
  lines: RentalReportLineDto[];
  totalOrders: number;
  totalRevenue: number;
  averageDuration: number;
  statusCounts: Array<{ status: string; count: number }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DispatchReportLineDto {
  id: string;
  dispatchNumber: string;
  rentalOrderId: string;
  orderNumber: string;
  status: string;
  dispatchDate: string;
  deliveryMethod: string;
  loadedAt: string | null;
  departedAt: string | null;
  deliveredAt: string | null;
  turnaroundHours: number | null;
}

export interface DispatchReportDto {
  lines: DispatchReportLineDto[];
  pendingCount: number;
  completedCount: number;
  averageTurnaroundHours: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ReturnReportLineDto {
  id: string;
  returnNumber: string;
  rentalOrderId: string;
  orderNumber: string;
  status: string;
  inspectionDate: string;
  receivedAt: string | null;
  completedAt: string | null;
  damagedQuantity: number;
  lostQuantity: number;
}

export interface ReturnReportDto {
  lines: ReturnReportLineDto[];
  outstandingCount: number;
  completedCount: number;
  totalDamaged: number;
  totalLost: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RepairReportLineDto {
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
  estimatedCost: number;
  actualCost: number | null;
}

export interface RepairReportDto {
  lines: RepairReportLineDto[];
  statusCounts: Array<{ status: string; count: number }>;
  averageTurnaroundDays: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MaintenanceReportLineDto {
  id: string;
  maintenanceNumber: string;
  productId: string;
  productName: string;
  warehouseId: string;
  status: string;
  serviceType: string;
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
  estimatedCost: number;
  actualCost: number | null;
}

export interface MaintenanceReportDto {
  lines: MaintenanceReportLineDto[];
  upcomingCount: number;
  completedCount: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProcurementReportLineDto {
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
}

export interface ProcurementReportDto {
  lines: ProcurementReportLineDto[];
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

export interface CustomerReportLineDto {
  customerId: string;
  customerCode: string;
  customerName: string;
  orderCount: number;
  completedOrderCount: number;
  revenue: number;
  outstandingBalance: number;
  lastOrderDate: string | null;
}

export interface CustomerReportDto {
  lines: CustomerReportLineDto[];
  totalCustomers: number;
  totalRevenue: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SupplierReportLineDto {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  purchaseOrderCount: number;
  purchaseTotal: number;
  lastOrderDate: string | null;
}

export interface SupplierReportDto {
  lines: SupplierReportLineDto[];
  totalSuppliers: number;
  totalPurchaseValue: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface WarehouseReportLineDto {
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

export interface WarehouseReportDto {
  lines: WarehouseReportLineDto[];
  totalWarehouses: number;
  totalInventoryValue: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProductReportLineDto {
  productId: string;
  productCode: string;
  productName: string;
  rentalCount: number;
  rentedQuantity: number;
  revenue: number;
  quantityOnHand: number;
  isRentable: boolean;
}

export interface ProductReportDto {
  lines: ProductReportLineDto[];
  mostRented: ProductReportLineDto[];
  leastRented: ProductReportLineDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
