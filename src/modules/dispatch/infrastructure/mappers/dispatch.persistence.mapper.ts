import type { Prisma } from "@/generated/prisma/client";
import { Dispatch } from "@/modules/dispatch/domain";
import {
  DISPATCH_STATUSES,
  type DeliveryMethod,
  type DispatchStatus,
} from "@/modules/dispatch/domain";
import { validateDispatchItems } from "@/modules/dispatch/domain/dispatch.rules";
import type {
  CreateDispatchData,
  UpdateDispatchData,
} from "@/modules/dispatch/domain";
import type {
  DispatchId,
  ProductId,
  RentalOrderId,
  UserId,
} from "@/shared/domain/ids";

function toDomainStatus(status: string): DispatchStatus {
  if ((DISPATCH_STATUSES as readonly string[]).includes(status)) {
    return status as DispatchStatus;
  }

  throw new Error(`Unsupported dispatch status for module: ${status}`);
}

function toDomainDeliveryMethod(method: string): DeliveryMethod {
  if (method === "DELIVERY" || method === "CUSTOMER_PICKUP") {
    return method;
  }

  throw new Error(`Unsupported delivery method: ${method}`);
}

export function toDispatchDomain(record: {
  id: string;
  dispatchNumber: string;
  rentalOrderId: string;
  dispatchDate: Date;
  deliveryMethod: string;
  vehicleNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  deliveryAddress: string;
  remarks: string | null;
  status: string;
  loadedAt: Date | null;
  departedAt: Date | null;
  deliveredAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string;
    rentalOrderItemId: string | null;
    quantity: number;
    notes: string | null;
  }>;
}): Dispatch {
  return Dispatch.reconstitute({
    id: record.id as DispatchId,
    dispatchNumber: record.dispatchNumber,
    rentalOrderId: record.rentalOrderId as RentalOrderId,
    dispatchDate: record.dispatchDate,
    deliveryMethod: toDomainDeliveryMethod(record.deliveryMethod),
    vehicleNumber: record.vehicleNumber,
    driverName: record.driverName,
    driverPhone: record.driverPhone,
    deliveryAddress: record.deliveryAddress,
    remarks: record.remarks,
    status: toDomainStatus(record.status),
    readyAt: record.loadedAt,
    dispatchedAt: record.departedAt,
    completedAt: record.deliveredAt,
    items: record.items.map((item) => ({
      id: item.id,
      productId: item.productId as ProductId,
      rentalOrderItemId: item.rentalOrderItemId,
      quantity: item.quantity,
      notes: item.notes,
    })),
    createdById: record.createdById as UserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toDispatchCreateInput(
  data: CreateDispatchData,
): Prisma.DispatchCreateInput {
  const normalized = Dispatch.create(data);

  return {
    dispatchNumber: normalized.dispatchNumber,
    rentalOrder: { connect: { id: normalized.rentalOrderId } },
    dispatchDate: normalized.dispatchDate,
    deliveryMethod: normalized.deliveryMethod,
    vehicleNumber: normalized.vehicleNumber,
    driverName: normalized.driverName,
    driverPhone: normalized.driverPhone,
    deliveryAddress: normalized.deliveryAddress,
    remarks: normalized.remarks,
    status: "DRAFT",
    createdBy: { connect: { id: normalized.createdById } },
    items: {
      create: normalized.items.map((item) => ({
        product: { connect: { id: item.productId } },
        rentalOrderItem: item.rentalOrderItemId
          ? { connect: { id: item.rentalOrderItemId } }
          : undefined,
        quantity: item.quantity,
        notes: item.notes,
      })),
    },
  };
}

export function toDispatchUpdateInput(
  data: UpdateDispatchData,
  _existing: Dispatch,
): Prisma.DispatchUpdateInput {
  const update: Prisma.DispatchUpdateInput = {};

  if (data.dispatchDate !== undefined) {
    update.dispatchDate = data.dispatchDate;
  }

  if (data.deliveryMethod !== undefined) {
    update.deliveryMethod = data.deliveryMethod;
  }

  if (data.vehicleNumber !== undefined) {
    update.vehicleNumber = data.vehicleNumber;
  }

  if (data.driverName !== undefined) {
    update.driverName = data.driverName;
  }

  if (data.driverPhone !== undefined) {
    update.driverPhone = data.driverPhone;
  }

  if (data.deliveryAddress !== undefined) {
    update.deliveryAddress = data.deliveryAddress;
  }

  if (data.remarks !== undefined) {
    update.remarks = data.remarks;
  }

  if (data.items !== undefined) {
    const normalizedItems = validateDispatchItems(data.items);

    update.items = {
      deleteMany: {},
      create: normalizedItems.map((item) => ({
        product: { connect: { id: item.productId } },
        rentalOrderItem: item.rentalOrderItemId
          ? { connect: { id: item.rentalOrderItemId } }
          : undefined,
        quantity: item.quantity,
        notes: item.notes,
      })),
    };
  } else if (Object.keys(update).length === 0) {
    return update;
  }

  return update;
}

export function toDispatchStatusUpdateInput(
  status: DispatchStatus,
  timestamps?: {
    readyAt?: Date | null;
    dispatchedAt?: Date | null;
    completedAt?: Date | null;
  },
): Prisma.DispatchUpdateInput {
  const update: Prisma.DispatchUpdateInput = { status };

  if (timestamps?.readyAt !== undefined) {
    update.loadedAt = timestamps.readyAt;
  }

  if (timestamps?.dispatchedAt !== undefined) {
    update.departedAt = timestamps.dispatchedAt;
  }

  if (timestamps?.completedAt !== undefined) {
    update.deliveredAt = timestamps.completedAt;
  }

  return update;
}

export const DISPATCH_INCLUDE = {
  items: true,
} as const satisfies Prisma.DispatchInclude;
