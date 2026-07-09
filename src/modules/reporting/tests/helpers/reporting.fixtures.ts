export const CUSTOMER_ONE_ID = "11111111-1111-4111-8111-111111111111";
export const CUSTOMER_TWO_ID = "22222222-2222-4222-8222-222222222222";
export const SUPPLIER_ONE_ID = "33333333-3333-4333-8333-333333333333";
export const SUPPLIER_TWO_ID = "44444444-4444-4444-8444-444444444444";
export const WAREHOUSE_ONE_ID = "55555555-5555-4555-8555-555555555555";
export const WAREHOUSE_TWO_ID = "66666666-6666-4666-8666-666666666666";
export const PRODUCT_ONE_ID = "77777777-7777-4777-8777-777777777777";
export const PRODUCT_TWO_ID = "88888888-8888-4888-8888-888888888888";
export const PRODUCT_THREE_ID = "99999999-9999-4999-8999-999999999999";
export const INVENTORY_ONE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
export const INVENTORY_TWO_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
export const INVENTORY_THREE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
export const RENTAL_ONE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
export const RENTAL_TWO_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
export const RENTAL_THREE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3";
export const RENTAL_ITEM_ONE_ID = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
export const RENTAL_ITEM_TWO_ID = "cccccccc-cccc-4ccc-8ccc-ccccccccccc2";
export const RENTAL_ITEM_THREE_ID = "cccccccc-cccc-4ccc-8ccc-ccccccccccc3";
export const DISPATCH_ONE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd1";
export const DISPATCH_TWO_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd2";
export const RETURN_ONE_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1";
export const RETURN_TWO_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2";
export const REPAIR_ONE_ID = "ffffffff-ffff-4fff-8fff-fffffffffff1";
export const REPAIR_TWO_ID = "ffffffff-ffff-4fff-8fff-fffffffffff2";
export const MAINTENANCE_ONE_ID = "10101010-1010-4101-8101-101010101010";
export const MAINTENANCE_TWO_ID = "20202020-2020-4202-8202-202020202020";
export const PO_ONE_ID = "30303030-3030-4303-8303-303030303030";
export const PO_TWO_ID = "40404040-4040-4404-8404-404040404040";
export const INVOICE_ONE_ID = "50505050-5050-4505-8505-505050505050";
export const INVOICE_TWO_ID = "60606060-6060-4606-8606-606060606060";
export const PAYMENT_ONE_ID = "70707070-7070-4707-8707-707070707070";

export interface FixtureCustomer {
  id: string;
  customerCode: string;
  name: string;
  isActive: boolean;
}

export interface FixtureSupplier {
  id: string;
  supplierCode: string;
  name: string;
  isActive: boolean;
}

export interface FixtureWarehouse {
  id: string;
  warehouseCode: string;
  name: string;
  isActive: boolean;
}

export interface FixtureProduct {
  id: string;
  productCode: string;
  name: string;
  purchaseCost: number;
  isRentable: boolean;
  isActive: boolean;
  totalQuantity: number;
}

export interface FixtureInventory {
  id: string;
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  reservedQuantity: number;
  minimumStock: number;
  maximumStock: number | null;
  createdAt: Date;
  isActive: boolean;
}

export interface FixtureRentalOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  warehouseId: string;
  status: string;
  bookingDate: Date;
  eventStartDate: Date;
  eventEndDate: Date;
  expectedReturnDate: Date;
  actualReturnDate: Date | null;
  grandTotal: number;
}

export interface FixtureRentalOrderItem {
  id: string;
  rentalOrderId: string;
  productId: string;
  quantity: number;
  lineTotal: number;
}

export interface FixtureReturnItem {
  brokenQuantity: number;
  lostQuantity: number;
}

export interface FixtureDispatch {
  id: string;
  dispatchNumber: string;
  rentalOrderId: string;
  status: string;
  dispatchDate: Date;
  deliveryMethod: string;
  loadedAt: Date | null;
  departedAt: Date | null;
  deliveredAt: Date | null;
}

export interface FixtureReturn {
  id: string;
  returnNumber: string;
  rentalOrderId: string;
  status: string;
  inspectionDate: Date;
  receivedAt: Date | null;
  completedAt: Date | null;
  items: FixtureReturnItem[];
}

export interface FixtureRepair {
  id: string;
  repairNumber: string;
  productId: string;
  warehouseId: string;
  status: string;
  repairDate: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  estimatedCost: number;
  actualCost: number | null;
}

export interface FixtureMaintenance {
  id: string;
  maintenanceNumber: string;
  productId: string;
  warehouseId: string;
  status: string;
  serviceType: string;
  scheduledDate: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  estimatedCost: number;
  actualCost: number | null;
}

export interface FixturePurchaseOrderItem {
  quantity: number;
  unitCost: number;
}

export interface FixturePurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  warehouseId: string;
  status: string;
  orderDate: Date;
  expectedDate: Date | null;
  items: FixturePurchaseOrderItem[];
}

export interface FixtureInvoice {
  id: string;
  customerId: string;
  status: string;
  invoiceDate: Date;
  grandTotal: number;
  balance: number;
}

export interface FixturePayment {
  id: string;
  paymentDate: Date;
  amount: number;
  status: string;
}

export function buildCustomer(
  overrides: Partial<FixtureCustomer> = {},
): FixtureCustomer {
  return {
    id: CUSTOMER_ONE_ID,
    customerCode: "CUST-001",
    name: "Acme Events",
    isActive: true,
    ...overrides,
  };
}

export function buildSupplier(
  overrides: Partial<FixtureSupplier> = {},
): FixtureSupplier {
  return {
    id: SUPPLIER_ONE_ID,
    supplierCode: "SUP-001",
    name: "Supply Co",
    isActive: true,
    ...overrides,
  };
}

export function buildWarehouse(
  overrides: Partial<FixtureWarehouse> = {},
): FixtureWarehouse {
  return {
    id: WAREHOUSE_ONE_ID,
    warehouseCode: "WH-001",
    name: "Main Warehouse",
    isActive: true,
    ...overrides,
  };
}

export function buildProduct(
  overrides: Partial<FixtureProduct> = {},
): FixtureProduct {
  return {
    id: PRODUCT_ONE_ID,
    productCode: "PROD-001",
    name: "Folding Chair",
    purchaseCost: 25,
    isRentable: true,
    isActive: true,
    totalQuantity: 100,
    ...overrides,
  };
}

export function buildInventory(
  overrides: Partial<FixtureInventory> = {},
): FixtureInventory {
  return {
    id: INVENTORY_ONE_ID,
    productId: PRODUCT_ONE_ID,
    warehouseId: WAREHOUSE_ONE_ID,
    quantityOnHand: 50,
    reservedQuantity: 10,
    minimumStock: 5,
    maximumStock: 100,
    createdAt: new Date("2026-01-10T00:00:00.000Z"),
    isActive: true,
    ...overrides,
  };
}

export function buildRentalOrder(
  overrides: Partial<FixtureRentalOrder> = {},
): FixtureRentalOrder {
  return {
    id: RENTAL_ONE_ID,
    orderNumber: "RO-001",
    customerId: CUSTOMER_ONE_ID,
    warehouseId: WAREHOUSE_ONE_ID,
    status: "CONFIRMED",
    bookingDate: new Date("2026-06-01T00:00:00.000Z"),
    eventStartDate: new Date("2026-06-10T00:00:00.000Z"),
    eventEndDate: new Date("2026-06-12T00:00:00.000Z"),
    expectedReturnDate: new Date("2026-06-13T00:00:00.000Z"),
    actualReturnDate: null,
    grandTotal: 500,
    ...overrides,
  };
}

export function buildRentalOrderItem(
  overrides: Partial<FixtureRentalOrderItem> = {},
): FixtureRentalOrderItem {
  return {
    id: RENTAL_ITEM_ONE_ID,
    rentalOrderId: RENTAL_ONE_ID,
    productId: PRODUCT_ONE_ID,
    quantity: 20,
    lineTotal: 300,
    ...overrides,
  };
}

export function buildDispatch(
  overrides: Partial<FixtureDispatch> = {},
): FixtureDispatch {
  return {
    id: DISPATCH_ONE_ID,
    dispatchNumber: "DSP-001",
    rentalOrderId: RENTAL_ONE_ID,
    status: "READY",
    dispatchDate: new Date("2026-06-09T00:00:00.000Z"),
    deliveryMethod: "DELIVERY",
    loadedAt: null,
    departedAt: null,
    deliveredAt: null,
    ...overrides,
  };
}

export function buildReturn(
  overrides: Partial<FixtureReturn> = {},
): FixtureReturn {
  return {
    id: RETURN_ONE_ID,
    returnNumber: "RET-001",
    rentalOrderId: RENTAL_ONE_ID,
    status: "DRAFT",
    inspectionDate: new Date("2026-06-14T00:00:00.000Z"),
    receivedAt: null,
    completedAt: null,
    items: [{ brokenQuantity: 1, lostQuantity: 0 }],
    ...overrides,
  };
}

export function buildRepair(
  overrides: Partial<FixtureRepair> = {},
): FixtureRepair {
  return {
    id: REPAIR_ONE_ID,
    repairNumber: "RPR-001",
    productId: PRODUCT_ONE_ID,
    warehouseId: WAREHOUSE_ONE_ID,
    status: "PENDING",
    repairDate: new Date("2026-06-15T00:00:00.000Z"),
    startedAt: null,
    completedAt: null,
    estimatedCost: 50,
    actualCost: null,
    ...overrides,
  };
}

export function buildMaintenance(
  overrides: Partial<FixtureMaintenance> = {},
): FixtureMaintenance {
  return {
    id: MAINTENANCE_ONE_ID,
    maintenanceNumber: "MNT-001",
    productId: PRODUCT_ONE_ID,
    warehouseId: WAREHOUSE_ONE_ID,
    status: "SCHEDULED",
    serviceType: "INSPECTION",
    scheduledDate: new Date("2026-07-01T00:00:00.000Z"),
    startedAt: null,
    completedAt: null,
    estimatedCost: 75,
    actualCost: null,
    ...overrides,
  };
}

export function buildPurchaseOrder(
  overrides: Partial<FixturePurchaseOrder> = {},
): FixturePurchaseOrder {
  return {
    id: PO_ONE_ID,
    poNumber: "PO-001",
    supplierId: SUPPLIER_ONE_ID,
    warehouseId: WAREHOUSE_ONE_ID,
    status: "APPROVED",
    orderDate: new Date("2026-05-01T00:00:00.000Z"),
    expectedDate: new Date("2026-05-15T00:00:00.000Z"),
    items: [{ quantity: 10, unitCost: 20 }],
    ...overrides,
  };
}

export function buildInvoice(
  overrides: Partial<FixtureInvoice> = {},
): FixtureInvoice {
  return {
    id: INVOICE_ONE_ID,
    customerId: CUSTOMER_ONE_ID,
    status: "ISSUED",
    invoiceDate: new Date("2026-07-05T00:00:00.000Z"),
    grandTotal: 500,
    balance: 500,
    ...overrides,
  };
}

export function buildPayment(
  overrides: Partial<FixturePayment> = {},
): FixturePayment {
  return {
    id: PAYMENT_ONE_ID,
    paymentDate: new Date("2026-07-06T00:00:00.000Z"),
    amount: 250,
    status: "POSTED",
    ...overrides,
  };
}

export function buildStandardReportingDataset() {
  return {
    customers: [
      buildCustomer(),
      buildCustomer({
        id: CUSTOMER_TWO_ID,
        customerCode: "CUST-002",
        name: "Beta Rentals",
      }),
    ],
    suppliers: [
      buildSupplier(),
      buildSupplier({
        id: SUPPLIER_TWO_ID,
        supplierCode: "SUP-002",
        name: "Parts Direct",
      }),
    ],
    warehouses: [
      buildWarehouse(),
      buildWarehouse({
        id: WAREHOUSE_TWO_ID,
        warehouseCode: "WH-002",
        name: "Secondary Warehouse",
      }),
    ],
    products: [
      buildProduct(),
      buildProduct({
        id: PRODUCT_TWO_ID,
        productCode: "PROD-002",
        name: "Round Table",
        purchaseCost: 100,
        isRentable: true,
      }),
      buildProduct({
        id: PRODUCT_THREE_ID,
        productCode: "PROD-003",
        name: "Storage Crate",
        purchaseCost: 15,
        isRentable: false,
      }),
    ],
    inventories: [
      buildInventory(),
      buildInventory({
        id: INVENTORY_TWO_ID,
        productId: PRODUCT_TWO_ID,
        warehouseId: WAREHOUSE_ONE_ID,
        quantityOnHand: 3,
        reservedQuantity: 0,
        minimumStock: 5,
        maximumStock: 50,
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
      }),
      buildInventory({
        id: INVENTORY_THREE_ID,
        productId: PRODUCT_ONE_ID,
        warehouseId: WAREHOUSE_TWO_ID,
        quantityOnHand: 120,
        reservedQuantity: 20,
        minimumStock: 10,
        maximumStock: 100,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
      }),
    ],
    rentals: [
      buildRentalOrder(),
      buildRentalOrder({
        id: RENTAL_TWO_ID,
        orderNumber: "RO-002",
        customerId: CUSTOMER_TWO_ID,
        status: "COMPLETED",
        bookingDate: new Date("2026-05-15T00:00:00.000Z"),
        eventStartDate: new Date("2026-05-20T00:00:00.000Z"),
        eventEndDate: new Date("2026-05-22T00:00:00.000Z"),
        grandTotal: 800,
        actualReturnDate: new Date("2026-05-23T00:00:00.000Z"),
      }),
      buildRentalOrder({
        id: RENTAL_THREE_ID,
        orderNumber: "RO-003",
        status: "RESERVED",
        bookingDate: new Date("2026-07-01T00:00:00.000Z"),
        eventStartDate: new Date("2026-07-10T00:00:00.000Z"),
        eventEndDate: new Date("2026-07-11T00:00:00.000Z"),
        grandTotal: 200,
      }),
      buildRentalOrder({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4",
        orderNumber: "RO-CANCEL",
        status: "CANCELLED",
        bookingDate: new Date("2026-04-01T00:00:00.000Z"),
        eventStartDate: new Date("2026-04-05T00:00:00.000Z"),
        eventEndDate: new Date("2026-04-06T00:00:00.000Z"),
        grandTotal: 0,
      }),
    ],
    rentalOrderItems: [
      buildRentalOrderItem(),
      buildRentalOrderItem({
        id: RENTAL_ITEM_TWO_ID,
        rentalOrderId: RENTAL_TWO_ID,
        productId: PRODUCT_TWO_ID,
        quantity: 5,
        lineTotal: 500,
      }),
      buildRentalOrderItem({
        id: RENTAL_ITEM_THREE_ID,
        rentalOrderId: RENTAL_THREE_ID,
        productId: PRODUCT_ONE_ID,
        quantity: 2,
        lineTotal: 200,
      }),
    ],
    dispatches: [
      buildDispatch(),
      buildDispatch({
        id: DISPATCH_TWO_ID,
        dispatchNumber: "DSP-002",
        rentalOrderId: RENTAL_TWO_ID,
        status: "COMPLETED",
        dispatchDate: new Date("2026-05-19T00:00:00.000Z"),
        loadedAt: new Date("2026-05-19T08:00:00.000Z"),
        departedAt: new Date("2026-05-19T09:00:00.000Z"),
        deliveredAt: new Date("2026-05-19T12:00:00.000Z"),
      }),
      buildDispatch({
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd3",
        dispatchNumber: "DSP-003",
        rentalOrderId: RENTAL_THREE_ID,
        status: "DISPATCHED",
        dispatchDate: new Date("2026-07-08T00:00:00.000Z"),
      }),
    ],
    returns: [
      buildReturn(),
      buildReturn({
        id: RETURN_TWO_ID,
        returnNumber: "RET-002",
        rentalOrderId: RENTAL_TWO_ID,
        status: "COMPLETED",
        inspectionDate: new Date("2026-05-24T00:00:00.000Z"),
        receivedAt: new Date("2026-05-24T10:00:00.000Z"),
        completedAt: new Date("2026-05-24T14:00:00.000Z"),
        items: [{ brokenQuantity: 0, lostQuantity: 1 }],
      }),
    ],
    repairs: [
      buildRepair(),
      buildRepair({
        id: REPAIR_TWO_ID,
        repairNumber: "RPR-002",
        status: "IN_PROGRESS",
        repairDate: new Date("2026-06-20T00:00:00.000Z"),
        startedAt: new Date("2026-06-20T08:00:00.000Z"),
        completedAt: null,
      }),
      buildRepair({
        id: "ffffffff-ffff-4fff-8fff-fffffffffff3",
        repairNumber: "RPR-003",
        status: "COMPLETED",
        repairDate: new Date("2026-05-01T00:00:00.000Z"),
        startedAt: new Date("2026-05-02T00:00:00.000Z"),
        completedAt: new Date("2026-05-04T00:00:00.000Z"),
        actualCost: 45,
      }),
    ],
    maintenances: [
      buildMaintenance(),
      buildMaintenance({
        id: MAINTENANCE_TWO_ID,
        maintenanceNumber: "MNT-002",
        status: "IN_PROGRESS",
        scheduledDate: new Date("2026-07-05T00:00:00.000Z"),
        startedAt: new Date("2026-07-05T09:00:00.000Z"),
      }),
      buildMaintenance({
        id: "10101010-1010-4101-8101-101010101011",
        maintenanceNumber: "MNT-003",
        status: "COMPLETED",
        scheduledDate: new Date("2026-04-01T00:00:00.000Z"),
        startedAt: new Date("2026-04-01T09:00:00.000Z"),
        completedAt: new Date("2026-04-01T17:00:00.000Z"),
        actualCost: 70,
      }),
    ],
    purchaseOrders: [
      buildPurchaseOrder(),
      buildPurchaseOrder({
        id: PO_TWO_ID,
        poNumber: "PO-002",
        supplierId: SUPPLIER_TWO_ID,
        status: "RECEIVED",
        orderDate: new Date("2026-04-10T00:00:00.000Z"),
        items: [{ quantity: 5, unitCost: 40 }],
      }),
      buildPurchaseOrder({
        id: "50505050-5050-4505-8505-505050505051",
        poNumber: "PO-003",
        status: "DRAFT",
        orderDate: new Date("2026-07-02T00:00:00.000Z"),
        items: [{ quantity: 2, unitCost: 100 }],
      }),
    ],
    invoices: [
      buildInvoice(),
      buildInvoice({
        id: INVOICE_TWO_ID,
        customerId: CUSTOMER_TWO_ID,
        status: "PAID",
        invoiceDate: new Date("2026-07-08T00:00:00.000Z"),
        grandTotal: 800,
        balance: 0,
      }),
      buildInvoice({
        id: "80808080-8080-4808-8808-808080808080",
        customerId: CUSTOMER_ONE_ID,
        status: "PARTIALLY_PAID",
        invoiceDate: new Date("2026-06-01T00:00:00.000Z"),
        grandTotal: 300,
        balance: 150,
      }),
    ],
    payments: [
      buildPayment(),
      buildPayment({
        id: "70707070-7070-4707-8707-707070707071",
        paymentDate: new Date("2026-06-15T00:00:00.000Z"),
        amount: 100,
        status: "POSTED",
      }),
      buildPayment({
        id: "70707070-7070-4707-8707-707070707072",
        paymentDate: new Date("2026-07-07T00:00:00.000Z"),
        amount: 50,
        status: "PENDING",
      }),
    ],
  };
}
