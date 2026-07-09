import type {
  CustomerReportQuery,
  DashboardQuery,
  DispatchReportQuery,
  InventoryReportQuery,
  MaintenanceReportQuery,
  ProcurementReportQuery,
  ProductReportQuery,
  RentalReportQuery,
  RepairReportQuery,
  ReturnReportQuery,
  SupplierReportQuery,
  WarehouseReportQuery,
} from "@/modules/reporting/domain/reporting.queries";
import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import {
  average,
  calculateAvailableQuantity,
  calculateInventoryValue,
  calculateRentalDurationDays,
  endOfMonth,
  inDateRange,
  isLowStock,
  isOverstock,
  roundMoney,
  startOfMonth,
  totalPages,
} from "@/modules/reporting/domain/reporting.rules";
import type {
  CustomerReport,
  CustomerReportLine,
  DashboardSummary,
  DispatchReport,
  DispatchReportLine,
  InventoryReport,
  InventoryReportLine,
  MaintenanceReport,
  MaintenanceReportLine,
  ProcurementReport,
  ProcurementReportLine,
  ProductReport,
  ProductReportLine,
  RentalReport,
  RentalReportLine,
  RepairReport,
  RepairReportLine,
  ReturnReport,
  ReturnReportLine,
  SupplierReport,
  SupplierReportLine,
  WarehouseReport,
  WarehouseReportLine,
} from "@/modules/reporting/domain/reporting.types";

import type {
  FixtureCustomer,
  FixtureDispatch,
  FixtureInventory,
  FixtureInvoice,
  FixtureMaintenance,
  FixturePayment,
  FixtureProduct,
  FixturePurchaseOrder,
  FixtureRentalOrder,
  FixtureRentalOrderItem,
  FixtureRepair,
  FixtureReturn,
  FixtureSupplier,
  FixtureWarehouse,
} from "./reporting.fixtures";

function daysSince(date: Date, reference: Date = new Date()): number {
  const ms = reference.getTime() - date.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function hoursBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  if (ms < 0) {
    return 0;
  }
  return roundMoney(ms / (1000 * 60 * 60));
}

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  if (ms < 0) {
    return 0;
  }
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function matchesSearch(
  search: string | undefined,
  ...values: Array<string | null | undefined>
): boolean {
  if (search === undefined || search.length === 0) {
    return true;
  }
  const lower = search.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(lower) ?? false);
}

function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): { lines: T[]; total: number; totalPages: number } {
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    lines: items.slice(start, start + pageSize),
    total,
    totalPages: totalPages(total, pageSize),
  };
}

function sortByField<T>(
  items: T[],
  sortBy: string | undefined,
  sortOrder: "asc" | "desc" | undefined,
  fieldMap: Record<string, (item: T) => string | number | Date | null>,
  defaultField: string,
): T[] {
  const field = sortBy ?? defaultField;
  const getter = fieldMap[field] ?? fieldMap[defaultField]!;
  const order = sortOrder ?? "asc";
  const direction = order === "asc" ? 1 : -1;

  return [...items].sort((left, right) => {
    const leftValue = getter(left);
    const rightValue = getter(right);

    if (leftValue === null && rightValue === null) {
      return 0;
    }
    if (leftValue === null) {
      return 1;
    }
    if (rightValue === null) {
      return -1;
    }

    if (leftValue instanceof Date && rightValue instanceof Date) {
      return (leftValue.getTime() - rightValue.getTime()) * direction;
    }

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * direction;
    }

    return String(leftValue).localeCompare(String(rightValue)) * direction;
  });
}

function countByStatus<T extends { status: string }>(
  items: T[],
): Array<{ status: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => a.status.localeCompare(b.status));
}

export interface ReportingSeedOptions {
  customers?: FixtureCustomer[];
  suppliers?: FixtureSupplier[];
  warehouses?: FixtureWarehouse[];
  products?: FixtureProduct[];
  inventories?: FixtureInventory[];
  rentals?: FixtureRentalOrder[];
  rentalOrderItems?: FixtureRentalOrderItem[];
  dispatches?: FixtureDispatch[];
  returns?: FixtureReturn[];
  repairs?: FixtureRepair[];
  maintenances?: FixtureMaintenance[];
  purchaseOrders?: FixturePurchaseOrder[];
  invoices?: FixtureInvoice[];
  payments?: FixturePayment[];
}

export class InMemoryReportingRepository implements IReportingRepository {
  private customers: FixtureCustomer[] = [];
  private suppliers: FixtureSupplier[] = [];
  private warehouses: FixtureWarehouse[] = [];
  private products: FixtureProduct[] = [];
  private inventories: FixtureInventory[] = [];
  private rentals: FixtureRentalOrder[] = [];
  private rentalOrderItems: FixtureRentalOrderItem[] = [];
  private dispatches: FixtureDispatch[] = [];
  private returns: FixtureReturn[] = [];
  private repairs: FixtureRepair[] = [];
  private maintenances: FixtureMaintenance[] = [];
  private purchaseOrders: FixturePurchaseOrder[] = [];
  private invoices: FixtureInvoice[] = [];
  private payments: FixturePayment[] = [];

  seed(options: ReportingSeedOptions): void {
    if (options.customers !== undefined) {
      this.customers = [...options.customers];
    }
    if (options.suppliers !== undefined) {
      this.suppliers = [...options.suppliers];
    }
    if (options.warehouses !== undefined) {
      this.warehouses = [...options.warehouses];
    }
    if (options.products !== undefined) {
      this.products = [...options.products];
    }
    if (options.inventories !== undefined) {
      this.inventories = [...options.inventories];
    }
    if (options.rentals !== undefined) {
      this.rentals = [...options.rentals];
    }
    if (options.rentalOrderItems !== undefined) {
      this.rentalOrderItems = [...options.rentalOrderItems];
    }
    if (options.dispatches !== undefined) {
      this.dispatches = [...options.dispatches];
    }
    if (options.returns !== undefined) {
      this.returns = [...options.returns];
    }
    if (options.repairs !== undefined) {
      this.repairs = [...options.repairs];
    }
    if (options.maintenances !== undefined) {
      this.maintenances = [...options.maintenances];
    }
    if (options.purchaseOrders !== undefined) {
      this.purchaseOrders = [...options.purchaseOrders];
    }
    if (options.invoices !== undefined) {
      this.invoices = [...options.invoices];
    }
    if (options.payments !== undefined) {
      this.payments = [...options.payments];
    }
  }

  clear(): void {
    this.customers = [];
    this.suppliers = [];
    this.warehouses = [];
    this.products = [];
    this.inventories = [];
    this.rentals = [];
    this.rentalOrderItems = [];
    this.dispatches = [];
    this.returns = [];
    this.repairs = [];
    this.maintenances = [];
    this.purchaseOrders = [];
    this.invoices = [];
    this.payments = [];
  }

  private getProduct(productId: string): FixtureProduct {
    return this.products.find((row) => row.id === productId)!;
  }

  private getWarehouse(warehouseId: string): FixtureWarehouse {
    return this.warehouses.find((row) => row.id === warehouseId)!;
  }

  private getCustomer(customerId: string): FixtureCustomer {
    return this.customers.find((row) => row.id === customerId)!;
  }

  private getRentalOrder(rentalOrderId: string): FixtureRentalOrder {
    return this.rentals.find((row) => row.id === rentalOrderId)!;
  }

  async getDashboard(query: DashboardQuery): Promise<DashboardSummary> {
    void query;
    const monthStart = startOfMonth();
    const monthEnd = endOfMonth();

    const activeCustomers = this.customers.filter((row) => row.isActive);
    const activeSuppliers = this.suppliers.filter((row) => row.isActive);
    const activeProducts = this.products.filter((row) => row.isActive);
    const activeWarehouses = this.warehouses.filter((row) => row.isActive);
    const activeInventories = this.inventories.filter((row) => row.isActive);

    let inventoryQuantity = 0;
    let reservedQuantity = 0;
    let inventoryValue = 0;

    for (const row of activeInventories) {
      const product = this.getProduct(row.productId);
      inventoryQuantity += row.quantityOnHand;
      reservedQuantity += row.reservedQuantity;
      inventoryValue = roundMoney(
        inventoryValue +
          calculateInventoryValue(row.quantityOnHand, product.purchaseCost),
      );
    }

    const availableQuantity = calculateAvailableQuantity(
      inventoryQuantity,
      reservedQuantity,
    );

    const nonCancelledOrders = this.rentals.filter(
      (order) => order.status !== "CANCELLED",
    );
    const durationValues = nonCancelledOrders.map((order) =>
      calculateRentalDurationDays(order.eventStartDate, order.eventEndDate),
    );

    const revenueThisMonth = roundMoney(
      this.invoices
        .filter(
          (invoice) =>
            ["ISSUED", "PARTIALLY_PAID", "PAID"].includes(invoice.status) &&
            invoice.invoiceDate.getTime() >= monthStart.getTime() &&
            invoice.invoiceDate.getTime() <= monthEnd.getTime(),
        )
        .reduce((sum, invoice) => sum + invoice.grandTotal, 0),
    );

    const paymentsThisMonth = roundMoney(
      this.payments
        .filter(
          (payment) =>
            payment.status === "POSTED" &&
            payment.paymentDate.getTime() >= monthStart.getTime() &&
            payment.paymentDate.getTime() <= monthEnd.getTime(),
        )
        .reduce((sum, payment) => sum + payment.amount, 0),
    );

    return {
      totalCustomers: activeCustomers.length,
      totalSuppliers: activeSuppliers.length,
      totalProducts: activeProducts.length,
      totalWarehouses: activeWarehouses.length,
      inventoryValue,
      inventoryQuantity,
      reservedQuantity,
      availableQuantity,
      rentalOrders: this.rentals.length,
      confirmedOrders: this.rentals.filter((order) => order.status === "CONFIRMED")
        .length,
      reservedOrders: this.rentals.filter((order) => order.status === "RESERVED")
        .length,
      completedRentals: this.rentals.filter(
        (order) => order.status === "COMPLETED",
      ).length,
      dispatchesReady: this.dispatches.filter(
        (dispatch) => dispatch.status === "READY",
      ).length,
      dispatchesInProgress: this.dispatches.filter(
        (dispatch) => dispatch.status === "DISPATCHED",
      ).length,
      pendingReturns: this.returns.filter(
        (row) => row.status === "DRAFT" || row.status === "RECEIVED",
      ).length,
      repairsPending: this.repairs.filter((row) => row.status === "PENDING").length,
      repairsInProgress: this.repairs.filter((row) => row.status === "IN_PROGRESS")
        .length,
      maintenanceScheduled: this.maintenances.filter(
        (row) => row.status === "SCHEDULED",
      ).length,
      maintenanceInProgress: this.maintenances.filter(
        (row) => row.status === "IN_PROGRESS",
      ).length,
      openPurchaseOrders: this.purchaseOrders.filter((row) =>
        ["DRAFT", "APPROVED", "PARTIALLY_RECEIVED"].includes(row.status),
      ).length,
      completedPurchaseOrders: this.purchaseOrders.filter(
        (row) => row.status === "RECEIVED",
      ).length,
      outstandingInvoices: this.invoices.filter((row) =>
        ["ISSUED", "PARTIALLY_PAID"].includes(row.status),
      ).length,
      paidInvoices: this.invoices.filter((row) => row.status === "PAID").length,
      revenueThisMonth,
      paymentsThisMonth,
      averageRentalDuration: average(durationValues),
    };
  }

  async getInventoryReport(
    query: InventoryReportQuery,
  ): Promise<InventoryReport> {
    const preFiltered = this.inventories.filter((row) => {
      if (query.warehouseId !== undefined && row.warehouseId !== query.warehouseId) {
        return false;
      }
      if (!inDateRange(row.createdAt, query.dateFrom, query.dateTo)) {
        return false;
      }
      const product = this.getProduct(row.productId);
      const warehouse = this.getWarehouse(row.warehouseId);
      return matchesSearch(
        query.search,
        product.productCode,
        product.name,
        warehouse.warehouseCode,
      );
    });

    const mapped: InventoryReportLine[] = preFiltered.map((row) => {
      const product = this.getProduct(row.productId);
      const warehouse = this.getWarehouse(row.warehouseId);
      const availableQuantity = calculateAvailableQuantity(
        row.quantityOnHand,
        row.reservedQuantity,
      );
      const inventoryValue = calculateInventoryValue(
        row.quantityOnHand,
        product.purchaseCost,
      );
      const lowStock = isLowStock(row.quantityOnHand, row.minimumStock);
      const overstock = isOverstock(row.quantityOnHand, row.maximumStock);

      return {
        inventoryId: row.id,
        productId: row.productId,
        productCode: product.productCode,
        productName: product.name,
        warehouseId: row.warehouseId,
        warehouseCode: warehouse.warehouseCode,
        warehouseName: warehouse.name,
        quantityOnHand: row.quantityOnHand,
        reservedQuantity: row.reservedQuantity,
        availableQuantity,
        minimumStock: row.minimumStock,
        maximumStock: row.maximumStock,
        purchaseCost: product.purchaseCost,
        inventoryValue,
        isLowStock: lowStock,
        isOverstock: overstock,
        ageDays: daysSince(row.createdAt),
      };
    });

    const filtered = mapped.filter((line) => {
      if (query.lowStockOnly === true && !line.isLowStock) {
        return false;
      }
      if (query.overstockOnly === true && !line.isOverstock) {
        return false;
      }
      return true;
    });

    const sorted = sortByField(
      filtered,
      query.sortBy,
      query.sortOrder,
      {
        productCode: (line) => line.productCode,
        warehouseCode: (line) => line.warehouseCode,
        quantityOnHand: (line) => line.quantityOnHand,
        availableQuantity: (line) => line.availableQuantity,
        inventoryValue: (line) => line.inventoryValue,
      },
      "productCode",
    );

    const page = paginate(sorted, query.page, query.pageSize);

    return {
      lines: page.lines,
      totalQuantity: filtered.reduce((sum, line) => sum + line.quantityOnHand, 0),
      totalReserved: filtered.reduce((sum, line) => sum + line.reservedQuantity, 0),
      totalAvailable: filtered.reduce(
        (sum, line) => sum + line.availableQuantity,
        0,
      ),
      totalValue: roundMoney(
        filtered.reduce((sum, line) => sum + line.inventoryValue, 0),
      ),
      lowStockCount: filtered.filter((line) => line.isLowStock).length,
      overstockCount: filtered.filter((line) => line.isOverstock).length,
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }

  async getRentalReport(query: RentalReportQuery): Promise<RentalReport> {
    const mapped: RentalReportLine[] = this.rentals.map((order) => {
      const customer = this.getCustomer(order.customerId);
      const warehouse = this.getWarehouse(order.warehouseId);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: customer.name,
        warehouseId: order.warehouseId,
        warehouseName: warehouse.name,
        status: order.status,
        bookingDate: order.bookingDate,
        eventStartDate: order.eventStartDate,
        eventEndDate: order.eventEndDate,
        expectedReturnDate: order.expectedReturnDate,
        actualReturnDate: order.actualReturnDate,
        durationDays: calculateRentalDurationDays(
          order.eventStartDate,
          order.eventEndDate,
        ),
        grandTotal: order.grandTotal,
      };
    });

    const filtered = mapped.filter((line) => {
      if (query.customerId !== undefined && line.customerId !== query.customerId) {
        return false;
      }
      if (query.warehouseId !== undefined && line.warehouseId !== query.warehouseId) {
        return false;
      }
      if (query.status !== undefined && line.status !== query.status) {
        return false;
      }
      if (!inDateRange(line.bookingDate, query.dateFrom, query.dateTo)) {
        return false;
      }
      return matchesSearch(
        query.search,
        line.orderNumber,
        line.customerName,
        line.warehouseName,
        line.status,
      );
    });

    const sorted = sortByField(
      filtered,
      query.sortBy,
      query.sortOrder,
      {
        orderNumber: (line) => line.orderNumber,
        bookingDate: (line) => line.bookingDate,
        eventStartDate: (line) => line.eventStartDate,
        status: (line) => line.status,
        grandTotal: (line) => line.grandTotal,
        createdAt: (line) => line.bookingDate,
      },
      "bookingDate",
    );

    const page = paginate(sorted, query.page, query.pageSize);

    return {
      lines: page.lines,
      totalOrders: filtered.length,
      totalRevenue: roundMoney(
        filtered.reduce((sum, line) => sum + line.grandTotal, 0),
      ),
      averageDuration: average(filtered.map((line) => line.durationDays)),
      statusCounts: countByStatus(filtered),
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }

  async getDispatchReport(query: DispatchReportQuery): Promise<DispatchReport> {
    const mapped: DispatchReportLine[] = this.dispatches.map((dispatch) => {
      const order = this.getRentalOrder(dispatch.rentalOrderId);
      let turnaroundHours: number | null = null;
      if (dispatch.deliveredAt !== null) {
        const start = dispatch.departedAt ?? dispatch.loadedAt;
        if (start !== null) {
          turnaroundHours = hoursBetween(start, dispatch.deliveredAt);
        }
      }

      return {
        id: dispatch.id,
        dispatchNumber: dispatch.dispatchNumber,
        rentalOrderId: dispatch.rentalOrderId,
        orderNumber: order.orderNumber,
        status: dispatch.status,
        dispatchDate: dispatch.dispatchDate,
        deliveryMethod: dispatch.deliveryMethod,
        loadedAt: dispatch.loadedAt,
        departedAt: dispatch.departedAt,
        deliveredAt: dispatch.deliveredAt,
        turnaroundHours,
      };
    });

    const filtered = mapped.filter((line) => {
      if (query.status !== undefined && line.status !== query.status) {
        return false;
      }
      if (!inDateRange(line.dispatchDate, query.dateFrom, query.dateTo)) {
        return false;
      }
      return matchesSearch(
        query.search,
        line.dispatchNumber,
        line.orderNumber,
        line.status,
        line.deliveryMethod,
      );
    });

    const sorted = sortByField(
      filtered,
      query.sortBy,
      query.sortOrder,
      {
        dispatchNumber: (line) => line.dispatchNumber,
        dispatchDate: (line) => line.dispatchDate,
        status: (line) => line.status,
        createdAt: (line) => line.dispatchDate,
      },
      "dispatchDate",
    );

    const page = paginate(sorted, query.page, query.pageSize);
    const turnaroundValues = filtered
      .map((line) => line.turnaroundHours)
      .filter((value): value is number => value !== null);

    return {
      lines: page.lines,
      pendingCount: filtered.filter(
        (line) => line.status === "READY" || line.status === "DISPATCHED",
      ).length,
      completedCount: filtered.filter((line) => line.status === "COMPLETED")
        .length,
      averageTurnaroundHours: average(turnaroundValues),
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }

  async getReturnReport(query: ReturnReportQuery): Promise<ReturnReport> {
    const mapped: ReturnReportLine[] = this.returns.map((row) => {
      const order = this.getRentalOrder(row.rentalOrderId);
      const damagedQuantity = row.items.reduce(
        (sum, item) => sum + item.brokenQuantity,
        0,
      );
      const lostQuantity = row.items.reduce(
        (sum, item) => sum + item.lostQuantity,
        0,
      );

      return {
        id: row.id,
        returnNumber: row.returnNumber,
        rentalOrderId: row.rentalOrderId,
        orderNumber: order.orderNumber,
        status: row.status,
        inspectionDate: row.inspectionDate,
        receivedAt: row.receivedAt,
        completedAt: row.completedAt,
        damagedQuantity,
        lostQuantity,
      };
    });

    const filtered = mapped.filter((line) => {
      if (query.status !== undefined && line.status !== query.status) {
        return false;
      }
      if (!inDateRange(line.inspectionDate, query.dateFrom, query.dateTo)) {
        return false;
      }
      return matchesSearch(
        query.search,
        line.returnNumber,
        line.orderNumber,
        line.status,
      );
    });

    const sorted = sortByField(
      filtered,
      query.sortBy,
      query.sortOrder,
      {
        returnNumber: (line) => line.returnNumber,
        inspectionDate: (line) => line.inspectionDate,
        status: (line) => line.status,
        createdAt: (line) => line.inspectionDate,
      },
      "inspectionDate",
    );

    const page = paginate(sorted, query.page, query.pageSize);

    return {
      lines: page.lines,
      outstandingCount: filtered.filter(
        (line) => line.status === "DRAFT" || line.status === "RECEIVED",
      ).length,
      completedCount: filtered.filter((line) => line.status === "COMPLETED")
        .length,
      totalDamaged: filtered.reduce((sum, line) => sum + line.damagedQuantity, 0),
      totalLost: filtered.reduce((sum, line) => sum + line.lostQuantity, 0),
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }

  async getRepairReport(query: RepairReportQuery): Promise<RepairReport> {
    const mapped: RepairReportLine[] = this.repairs.map((row) => {
      const product = this.getProduct(row.productId);
      let turnaroundDays: number | null = null;
      if (row.startedAt !== null && row.completedAt !== null) {
        turnaroundDays = daysBetween(row.startedAt, row.completedAt);
      }

      return {
        id: row.id,
        repairNumber: row.repairNumber,
        productId: row.productId,
        productName: product.name,
        warehouseId: row.warehouseId,
        status: row.status,
        repairDate: row.repairDate,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        turnaroundDays,
        estimatedCost: row.estimatedCost,
        actualCost: row.completedAt === null ? null : row.actualCost,
      };
    });

    const filtered = mapped.filter((line) => {
      if (query.warehouseId !== undefined && line.warehouseId !== query.warehouseId) {
        return false;
      }
      if (query.status !== undefined && line.status !== query.status) {
        return false;
      }
      if (!inDateRange(line.repairDate, query.dateFrom, query.dateTo)) {
        return false;
      }
      return matchesSearch(
        query.search,
        line.repairNumber,
        line.productName,
        line.status,
      );
    });

    const sorted = sortByField(
      filtered,
      query.sortBy,
      query.sortOrder,
      {
        repairNumber: (line) => line.repairNumber,
        repairDate: (line) => line.repairDate,
        status: (line) => line.status,
        createdAt: (line) => line.repairDate,
      },
      "repairDate",
    );

    const page = paginate(sorted, query.page, query.pageSize);
    const turnaroundValues = filtered
      .map((line) => line.turnaroundDays)
      .filter((value): value is number => value !== null);

    return {
      lines: page.lines,
      statusCounts: countByStatus(filtered),
      averageTurnaroundDays: average(turnaroundValues),
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }

  async getMaintenanceReport(
    query: MaintenanceReportQuery,
  ): Promise<MaintenanceReport> {
    const mapped: MaintenanceReportLine[] = this.maintenances.map((row) => {
      const product = this.getProduct(row.productId);
      return {
        id: row.id,
        maintenanceNumber: row.maintenanceNumber,
        productId: row.productId,
        productName: product.name,
        warehouseId: row.warehouseId,
        status: row.status,
        serviceType: row.serviceType,
        scheduledDate: row.scheduledDate,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        estimatedCost: row.estimatedCost,
        actualCost: row.completedAt === null ? null : row.actualCost,
      };
    });

    const filtered = mapped.filter((line) => {
      if (query.warehouseId !== undefined && line.warehouseId !== query.warehouseId) {
        return false;
      }
      if (query.status !== undefined && line.status !== query.status) {
        return false;
      }
      if (!inDateRange(line.scheduledDate, query.dateFrom, query.dateTo)) {
        return false;
      }
      return matchesSearch(
        query.search,
        line.maintenanceNumber,
        line.productName,
        line.status,
        line.serviceType,
      );
    });

    const sorted = sortByField(
      filtered,
      query.sortBy,
      query.sortOrder,
      {
        maintenanceNumber: (line) => line.maintenanceNumber,
        scheduledDate: (line) => line.scheduledDate,
        status: (line) => line.status,
        createdAt: (line) => line.scheduledDate,
      },
      "scheduledDate",
    );

    const page = paginate(sorted, query.page, query.pageSize);

    return {
      lines: page.lines,
      upcomingCount: filtered.filter((line) => line.status === "SCHEDULED")
        .length,
      completedCount: filtered.filter((line) => line.status === "COMPLETED")
        .length,
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }

  async getProcurementReport(
    query: ProcurementReportQuery,
  ): Promise<ProcurementReport> {
    const mapped: ProcurementReportLine[] = this.purchaseOrders.map((row) => {
      const supplierEntity = this.suppliers.find((s) => s.id === row.supplierId)!;
      const warehouse = this.getWarehouse(row.warehouseId);
      const purchaseTotal = roundMoney(
        row.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
      );

      return {
        id: row.id,
        poNumber: row.poNumber,
        supplierId: row.supplierId,
        supplierName: supplierEntity.name,
        warehouseId: row.warehouseId,
        warehouseName: warehouse.name,
        status: row.status,
        orderDate: row.orderDate,
        expectedDate: row.expectedDate,
        lineCount: row.items.length,
        purchaseTotal,
      };
    });

    const filtered = mapped.filter((line) => {
      if (query.supplierId !== undefined && line.supplierId !== query.supplierId) {
        return false;
      }
      if (query.warehouseId !== undefined && line.warehouseId !== query.warehouseId) {
        return false;
      }
      if (query.status !== undefined && line.status !== query.status) {
        return false;
      }
      if (!inDateRange(line.orderDate, query.dateFrom, query.dateTo)) {
        return false;
      }
      return matchesSearch(
        query.search,
        line.poNumber,
        line.supplierName,
        line.warehouseName,
        line.status,
      );
    });

    const sorted = sortByField(
      filtered,
      query.sortBy,
      query.sortOrder,
      {
        poNumber: (line) => line.poNumber,
        orderDate: (line) => line.orderDate,
        status: (line) => line.status,
        createdAt: (line) => line.orderDate,
      },
      "orderDate",
    );

    const page = paginate(sorted, query.page, query.pageSize);

    const supplierTotalsMap = new Map<
      string,
      { supplierName: string; purchaseOrderCount: number; purchaseTotal: number }
    >();
    for (const line of filtered) {
      const current = supplierTotalsMap.get(line.supplierId) ?? {
        supplierName: line.supplierName,
        purchaseOrderCount: 0,
        purchaseTotal: 0,
      };
      current.purchaseOrderCount += 1;
      current.purchaseTotal = roundMoney(
        current.purchaseTotal + line.purchaseTotal,
      );
      supplierTotalsMap.set(line.supplierId, current);
    }

    const supplierTotals = [...supplierTotalsMap.entries()]
      .map(([supplierId, totals]) => ({
        supplierId,
        supplierName: totals.supplierName,
        purchaseOrderCount: totals.purchaseOrderCount,
        purchaseTotal: totals.purchaseTotal,
      }))
      .sort((a, b) => b.purchaseTotal - a.purchaseTotal);

    return {
      lines: page.lines,
      totalPurchaseOrders: filtered.length,
      totalPurchaseValue: roundMoney(
        filtered.reduce((sum, line) => sum + line.purchaseTotal, 0),
      ),
      supplierTotals,
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }

  async getCustomerReport(query: CustomerReportQuery): Promise<CustomerReport> {
    const customerWhere =
      query.customerId !== undefined
        ? this.customers.filter(
            (row) => row.id === query.customerId && row.isActive,
          )
        : this.customers.filter((row) => row.isActive);

    const mapped: CustomerReportLine[] = customerWhere.map((customer) => {
      const customerOrders = this.rentals.filter((order) => {
        if (order.customerId !== customer.id) {
          return false;
        }
        return inDateRange(order.bookingDate, query.dateFrom, query.dateTo);
      });

      const outstandingBalance = roundMoney(
        this.invoices
          .filter(
            (invoice) =>
              invoice.customerId === customer.id &&
              ["ISSUED", "PARTIALLY_PAID"].includes(invoice.status),
          )
          .reduce((sum, invoice) => sum + invoice.balance, 0),
      );

      const revenue = roundMoney(
        customerOrders.reduce((sum, order) => sum + order.grandTotal, 0),
      );

      const lastOrderDate =
        customerOrders.length === 0
          ? null
          : customerOrders.reduce(
              (latest, order) =>
                latest === null || order.bookingDate > latest
                  ? order.bookingDate
                  : latest,
              null as Date | null,
            );

      return {
        customerId: customer.id,
        customerCode: customer.customerCode,
        customerName: customer.name,
        orderCount: customerOrders.length,
        completedOrderCount: customerOrders.filter(
          (order) => order.status === "COMPLETED",
        ).length,
        revenue,
        outstandingBalance,
        lastOrderDate,
      };
    });

    const filtered = mapped.filter((line) =>
      matchesSearch(query.search, line.customerCode, line.customerName),
    );

    const sorted = sortByField(
      filtered,
      query.sortBy,
      query.sortOrder,
      {
        customerCode: (line) => line.customerCode,
        name: (line) => line.customerName,
        orderCount: (line) => line.orderCount,
        revenue: (line) => line.revenue,
      },
      "customerCode",
    );

    const page = paginate(sorted, query.page, query.pageSize);

    return {
      lines: page.lines,
      totalCustomers: filtered.length,
      totalRevenue: roundMoney(
        filtered.reduce((sum, line) => sum + line.revenue, 0),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }

  async getSupplierReport(query: SupplierReportQuery): Promise<SupplierReport> {
    const supplierWhere =
      query.supplierId !== undefined
        ? this.suppliers.filter(
            (row) => row.id === query.supplierId && row.isActive,
          )
        : this.suppliers.filter((row) => row.isActive);

    const mapped: SupplierReportLine[] = supplierWhere.map((supplier) => {
      const supplierOrders = this.purchaseOrders.filter((order) => {
        if (order.supplierId !== supplier.id) {
          return false;
        }
        return inDateRange(order.orderDate, query.dateFrom, query.dateTo);
      });

      const purchaseTotal = roundMoney(
        supplierOrders.reduce(
          (sum, order) =>
            sum +
            order.items.reduce(
              (itemSum, item) => itemSum + item.quantity * item.unitCost,
              0,
            ),
          0,
        ),
      );

      const lastOrderDate =
        supplierOrders.length === 0
          ? null
          : supplierOrders.reduce(
              (latest, order) =>
                latest === null || order.orderDate > latest
                  ? order.orderDate
                  : latest,
              null as Date | null,
            );

      return {
        supplierId: supplier.id,
        supplierCode: supplier.supplierCode,
        supplierName: supplier.name,
        purchaseOrderCount: supplierOrders.length,
        purchaseTotal,
        lastOrderDate,
      };
    });

    const filtered = mapped.filter((line) =>
      matchesSearch(query.search, line.supplierCode, line.supplierName),
    );

    const sorted = sortByField(
      filtered,
      query.sortBy,
      query.sortOrder,
      {
        supplierCode: (line) => line.supplierCode,
        name: (line) => line.supplierName,
        purchaseOrderCount: (line) => line.purchaseOrderCount,
        purchaseTotal: (line) => line.purchaseTotal,
      },
      "supplierCode",
    );

    const page = paginate(sorted, query.page, query.pageSize);

    return {
      lines: page.lines,
      totalSuppliers: filtered.length,
      totalPurchaseValue: roundMoney(
        filtered.reduce((sum, line) => sum + line.purchaseTotal, 0),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }

  async getWarehouseReport(
    query: WarehouseReportQuery,
  ): Promise<WarehouseReport> {
    const warehouseWhere =
      query.warehouseId !== undefined
        ? this.warehouses.filter(
            (row) => row.id === query.warehouseId && row.isActive,
          )
        : this.warehouses.filter((row) => row.isActive);

    const activeInventories = this.inventories.filter((row) => row.isActive);

    const mapped: WarehouseReportLine[] = warehouseWhere.map((warehouse) => {
      const warehouseInventories = activeInventories.filter(
        (row) => row.warehouseId === warehouse.id,
      );

      const inventoryQuantity = warehouseInventories.reduce(
        (sum, row) => sum + row.quantityOnHand,
        0,
      );
      const reservedQuantity = warehouseInventories.reduce(
        (sum, row) => sum + row.reservedQuantity,
        0,
      );
      const availableQuantity = calculateAvailableQuantity(
        inventoryQuantity,
        reservedQuantity,
      );
      const inventoryValue = roundMoney(
        warehouseInventories.reduce(
          (sum, row) =>
            sum +
            calculateInventoryValue(
              row.quantityOnHand,
              this.getProduct(row.productId).purchaseCost,
            ),
          0,
        ),
      );
      const productIds = new Set(warehouseInventories.map((row) => row.productId));
      const utilizationPercent =
        inventoryQuantity === 0
          ? 0
          : roundMoney((reservedQuantity / inventoryQuantity) * 100);

      return {
        warehouseId: warehouse.id,
        warehouseCode: warehouse.warehouseCode,
        warehouseName: warehouse.name,
        inventoryQuantity,
        reservedQuantity,
        availableQuantity,
        inventoryValue,
        productCount: productIds.size,
        utilizationPercent,
      };
    });

    const filtered = mapped.filter((line) =>
      matchesSearch(query.search, line.warehouseCode, line.warehouseName),
    );

    const sorted = sortByField(
      filtered,
      query.sortBy,
      query.sortOrder,
      {
        warehouseCode: (line) => line.warehouseCode,
        name: (line) => line.warehouseName,
        inventoryQuantity: (line) => line.inventoryQuantity,
        inventoryValue: (line) => line.inventoryValue,
      },
      "warehouseCode",
    );

    const page = paginate(sorted, query.page, query.pageSize);

    return {
      lines: page.lines,
      totalWarehouses: filtered.length,
      totalInventoryValue: roundMoney(
        filtered.reduce((sum, line) => sum + line.inventoryValue, 0),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }

  async getProductReport(query: ProductReportQuery): Promise<ProductReport> {
    const activeProducts = this.products.filter((row) => row.isActive);
    const activeInventories = this.inventories.filter((row) => row.isActive);

    const inventoryByProduct = new Map<string, number>();
    for (const row of activeInventories) {
      inventoryByProduct.set(
        row.productId,
        (inventoryByProduct.get(row.productId) ?? 0) + row.quantityOnHand,
      );
    }

    const mapped: ProductReportLine[] = activeProducts.map((product) => {
      const productItems = this.rentalOrderItems.filter((item) => {
        if (item.productId !== product.id) {
          return false;
        }
        const order = this.getRentalOrder(item.rentalOrderId);
        return inDateRange(order.bookingDate, query.dateFrom, query.dateTo);
      });

      const rentalOrderIds = new Set(
        productItems.map((item) => item.rentalOrderId),
      );

      return {
        productId: product.id,
        productCode: product.productCode,
        productName: product.name,
        rentalCount: rentalOrderIds.size,
        rentedQuantity: productItems.reduce((sum, item) => sum + item.quantity, 0),
        revenue: roundMoney(
          productItems.reduce((sum, item) => sum + item.lineTotal, 0),
        ),
        quantityOnHand:
          inventoryByProduct.get(product.id) ?? product.totalQuantity,
        isRentable: product.isRentable,
      };
    });

    const filtered = mapped.filter((line) =>
      matchesSearch(query.search, line.productCode, line.productName),
    );

    const sorted = sortByField(
      filtered,
      query.sortBy,
      query.sortOrder,
      {
        productCode: (line) => line.productCode,
        name: (line) => line.productName,
        rentalCount: (line) => line.rentalCount,
        rentedQuantity: (line) => line.rentedQuantity,
      },
      "productCode",
    );

    const page = paginate(sorted, query.page, query.pageSize);

    const rentableProducts = filtered.filter((line) => line.isRentable);
    const mostRented = [...rentableProducts]
      .sort((a, b) => {
        if (b.rentalCount !== a.rentalCount) {
          return b.rentalCount - a.rentalCount;
        }
        return b.rentedQuantity - a.rentedQuantity;
      })
      .slice(0, 5);

    const leastRented = [...rentableProducts]
      .sort((a, b) => {
        if (a.rentalCount !== b.rentalCount) {
          return a.rentalCount - b.rentalCount;
        }
        return a.rentedQuantity - b.rentedQuantity;
      })
      .slice(0, 5);

    return {
      lines: page.lines,
      mostRented,
      leastRented,
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }
}
