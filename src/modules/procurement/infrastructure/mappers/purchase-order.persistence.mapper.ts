import { Prisma } from "@/generated/prisma/client";
import { PurchaseOrder } from "@/modules/procurement/domain/purchase-order.entity";
import { validatePurchaseOrderItems } from "@/modules/procurement/domain/purchase-order.rules";
import type {
  CreatePurchaseOrderData,
  UpdatePurchaseOrderData,
  UpdatePurchaseOrderReceiveData,
} from "@/modules/procurement/domain/purchase-order.types";
import type {
  ProductId,
  PurchaseOrderId,
  SupplierId,
  WarehouseId,
} from "@/shared/domain/ids";

function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

function toPrismaDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function toPurchaseOrderDomain(record: {
  id: string;
  poNumber: string;
  supplierId: string;
  warehouseId: string;
  status: PurchaseOrder["status"];
  orderDate: Date;
  expectedDate: Date | null;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitCost: Prisma.Decimal;
    receivedQuantity: number;
  }>;
}): PurchaseOrder {
  return PurchaseOrder.reconstitute({
    id: record.id as PurchaseOrderId,
    poNumber: record.poNumber,
    supplierId: record.supplierId as SupplierId,
    warehouseId: record.warehouseId as WarehouseId,
    status: record.status,
    orderDate: record.orderDate,
    expectedDate: record.expectedDate,
    remarks: record.remarks,
    items: record.items.map((item) => ({
      id: item.id,
      productId: item.productId as ProductId,
      quantity: item.quantity,
      unitCost: decimalToNumber(item.unitCost),
      receivedQuantity: item.receivedQuantity,
    })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toPurchaseOrderCreateInput(
  data: CreatePurchaseOrderData,
): Prisma.PurchaseOrderCreateInput {
  const normalized = PurchaseOrder.create(data);

  return {
    poNumber: normalized.poNumber,
    supplier: { connect: { id: normalized.supplierId } },
    warehouse: { connect: { id: normalized.warehouseId } },
    status: "DRAFT",
    orderDate: normalized.orderDate,
    expectedDate: normalized.expectedDate,
    remarks: normalized.remarks,
    items: {
      create: normalized.items.map((item) => ({
        product: { connect: { id: item.productId } },
        quantity: item.quantity,
        unitCost: toPrismaDecimal(item.unitCost),
        receivedQuantity: 0,
      })),
    },
  };
}

export function toPurchaseOrderUpdateInput(
  data: UpdatePurchaseOrderData,
): Prisma.PurchaseOrderUpdateInput {
  const update: Prisma.PurchaseOrderUpdateInput = {};

  if (data.supplierId !== undefined) {
    update.supplier = { connect: { id: data.supplierId } };
  }

  if (data.warehouseId !== undefined) {
    update.warehouse = { connect: { id: data.warehouseId } };
  }

  if (data.orderDate !== undefined) {
    update.orderDate = data.orderDate;
  }

  if (data.expectedDate !== undefined) {
    update.expectedDate = data.expectedDate;
  }

  if (data.remarks !== undefined) {
    update.remarks = data.remarks;
  }

  if (data.items !== undefined) {
    const normalizedItems = validatePurchaseOrderItems(data.items);

    update.items = {
      deleteMany: {},
      create: normalizedItems.map((item) => ({
        product: { connect: { id: item.productId } },
        quantity: item.quantity,
        unitCost: toPrismaDecimal(item.unitCost),
        receivedQuantity: 0,
      })),
    };
  }

  return update;
}

export function toPurchaseOrderReceiveUpdateInput(
  data: UpdatePurchaseOrderReceiveData,
): Prisma.PurchaseOrderUpdateInput {
  return {
    status: data.status,
    items: {
      update: data.items.map((item) => ({
        where: { id: item.id },
        data: { receivedQuantity: item.receivedQuantity },
      })),
    },
  };
}

export const PURCHASE_ORDER_INCLUDE = {
  items: true,
} as const satisfies Prisma.PurchaseOrderInclude;
