import { PurchaseOrder } from "@/modules/procurement/domain/purchase-order.entity";
import type { CreatePurchaseOrderData } from "@/modules/procurement/domain/purchase-order.types";
import type {
  ProductId,
  PurchaseOrderId,
  SupplierId,
  WarehouseId,
} from "@/shared/domain/ids";

export const PURCHASE_ORDER_ID =
  "aa0e8400-e29b-41d4-a716-446655440000" as PurchaseOrderId;

export const OTHER_PURCHASE_ORDER_ID =
  "aa0e8400-e29b-41d4-a716-446655440001" as PurchaseOrderId;

export const SUPPLIER_ID =
  "660e8400-e29b-41d4-a716-446655440000" as SupplierId;

export const WAREHOUSE_ID =
  "880e8400-e29b-41d4-a716-446655440020" as WarehouseId;

export const PRODUCT_ID =
  "880e8400-e29b-41d4-a716-446655440010" as ProductId;

export const OTHER_PRODUCT_ID =
  "880e8400-e29b-41d4-a716-446655440011" as ProductId;

export const ITEM_ID = "bb0e8400-e29b-41d4-a716-446655440000";
export const OTHER_ITEM_ID = "bb0e8400-e29b-41d4-a716-446655440001";

export const USER_ID = "770e8400-e29b-41d4-a716-446655440000";

export const VALID_CREATE_INPUT = {
  poNumber: "PO-2026-001",
  supplierId: SUPPLIER_ID,
  warehouseId: WAREHOUSE_ID,
  orderDate: "2026-01-15T00:00:00.000Z",
  expectedDate: "2026-01-30T00:00:00.000Z",
  remarks: "Urgent restock",
  items: [
    {
      productId: PRODUCT_ID,
      quantity: 100,
      unitCost: 25.5,
    },
  ],
};

export function buildCreatePurchaseOrderData(
  override: Partial<CreatePurchaseOrderData> = {},
): CreatePurchaseOrderData {
  return {
    poNumber: VALID_CREATE_INPUT.poNumber,
    supplierId: SUPPLIER_ID,
    warehouseId: WAREHOUSE_ID,
    orderDate: new Date(VALID_CREATE_INPUT.orderDate),
    expectedDate: new Date(VALID_CREATE_INPUT.expectedDate),
    remarks: VALID_CREATE_INPUT.remarks,
    items: VALID_CREATE_INPUT.items.map((item) => ({
      productId: item.productId as ProductId,
      quantity: item.quantity,
      unitCost: item.unitCost,
    })),
    ...override,
  };
}

export function buildPurchaseOrderEntity(
  override: {
    id?: PurchaseOrderId;
    status?: PurchaseOrder["status"];
    receivedQuantity?: number;
    items?: PurchaseOrder["items"];
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): PurchaseOrder {
  const created = PurchaseOrder.create(buildCreatePurchaseOrderData());
  const now = new Date("2026-01-15T10:00:00.000Z");
  const itemId = override.items?.[0]?.id ?? ITEM_ID;

  return PurchaseOrder.reconstitute({
    id: override.id ?? PURCHASE_ORDER_ID,
    poNumber: created.poNumber,
    supplierId: created.supplierId,
    warehouseId: created.warehouseId,
    status: override.status ?? "DRAFT",
    orderDate: created.orderDate,
    expectedDate: created.expectedDate,
    remarks: created.remarks,
    items:
      override.items ??
      created.items.map((item, index) => ({
        ...item,
        id: index === 0 ? itemId : OTHER_ITEM_ID,
        receivedQuantity: override.receivedQuantity ?? 0,
      })),
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}

export function buildApprovedPurchaseOrderEntity(): PurchaseOrder {
  return buildPurchaseOrderEntity({ status: "APPROVED" });
}

export function buildPartiallyReceivedPurchaseOrderEntity(): PurchaseOrder {
  return buildPurchaseOrderEntity({
    status: "PARTIALLY_RECEIVED",
    receivedQuantity: 40,
  });
}
