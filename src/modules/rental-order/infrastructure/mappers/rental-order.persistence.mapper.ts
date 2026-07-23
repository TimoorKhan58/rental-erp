import { Prisma } from "@/generated/prisma/client";
import { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import {
  RENTAL_ORDER_STATUSES,
  type RentalOrderStatus,
} from "@/modules/rental-order/domain/rental-order.constants";
import {
  computeLineTotal,
  computeOrderDateEnvelope,
  computeOrderSubtotal,
  computeRentalDays,
  validateRentalOrderItems,
} from "@/modules/rental-order/domain/rental-order.rules";
import type {
  CreateRentalOrderData,
  RentalOrderItemProps,
  UpdateRentalOrderData,
  UpdateRentalOrderReserveData,
} from "@/modules/rental-order/domain/rental-order.types";
import type {
  CustomerId,
  ProductId,
  RentalOrderId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

function toPrismaDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function toDomainStatus(status: string): RentalOrderStatus {
  if ((RENTAL_ORDER_STATUSES as readonly string[]).includes(status)) {
    return status as RentalOrderStatus;
  }

  throw new Error(`Unsupported rental order status for module: ${status}`);
}

export function toRentalOrderDomain(record: {
  id: string;
  orderNumber: string;
  customerId: string;
  warehouseId: string;
  status: string;
  eventStartDate: Date;
  eventEndDate: Date;
  notes: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    rentalPricePerDay: Prisma.Decimal;
    reservedQuantity: number;
    eventStartDate?: Date | null;
    eventEndDate?: Date | null;
    numberOfDays?: number | null;
  }>;
}): RentalOrder {
  return RentalOrder.reconstitute({
    id: record.id as RentalOrderId,
    orderNumber: record.orderNumber,
    customerId: record.customerId as CustomerId,
    warehouseId: record.warehouseId as WarehouseId,
    status: toDomainStatus(record.status),
    startDate: record.eventStartDate,
    endDate: record.eventEndDate,
    remarks: record.notes,
    items: record.items.map((item) => {
      const startDate = item.eventStartDate ?? record.eventStartDate;
      const endDate = item.eventEndDate ?? record.eventEndDate;
      const numberOfDays =
        item.numberOfDays && item.numberOfDays > 0
          ? item.numberOfDays
          : computeRentalDays(startDate, endDate);

      return {
        id: item.id,
        productId: item.productId as ProductId,
        quantity: item.quantity,
        dailyRate: decimalToNumber(item.rentalPricePerDay),
        reservedQuantity: item.reservedQuantity,
        startDate,
        endDate,
        numberOfDays,
      };
    }),
    createdById: record.createdById as UserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

function buildPersistenceTotals(items: RentalOrderItemProps[]): {
  subtotal: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
} {
  const subtotal = computeOrderSubtotal(items);
  const decimal = toPrismaDecimal(subtotal);
  return { subtotal: decimal, grandTotal: decimal };
}

function toItemCreateInput(item: RentalOrderItemProps) {
  return {
    product: { connect: { id: item.productId } },
    quantity: item.quantity,
    rentalPricePerDay: toPrismaDecimal(item.dailyRate),
    reservedQuantity: item.reservedQuantity,
    eventStartDate: item.startDate,
    eventEndDate: item.endDate,
    numberOfDays: item.numberOfDays,
    lineTotal: toPrismaDecimal(
      computeLineTotal(item.quantity, item.dailyRate, item.numberOfDays),
    ),
  };
}

export function toRentalOrderCreateInput(
  data: CreateRentalOrderData,
): Prisma.RentalOrderCreateInput {
  const normalized = RentalOrder.create(data);
  const totals = buildPersistenceTotals(normalized.items);
  const envelope = computeOrderDateEnvelope(normalized.items);

  return {
    orderNumber: normalized.orderNumber,
    customer: { connect: { id: normalized.customerId } },
    warehouse: { connect: { id: normalized.warehouseId } },
    status: "DRAFT",
    bookingDate: envelope.startDate,
    eventStartDate: envelope.startDate,
    eventEndDate: envelope.endDate,
    expectedReturnDate: envelope.endDate,
    deliveryRequired: false,
    deliveryAddress: "",
    deliveryCharges: toPrismaDecimal(0),
    labourCharges: toPrismaDecimal(0),
    discount: toPrismaDecimal(0),
    notes: normalized.remarks,
    subtotal: totals.subtotal,
    grandTotal: totals.grandTotal,
    createdBy: { connect: { id: normalized.createdById } },
    items: {
      create: normalized.items.map((item) => toItemCreateInput(item)),
    },
  };
}

export function toRentalOrderUpdateInput(
  data: UpdateRentalOrderData,
  existing: RentalOrder,
): Prisma.RentalOrderUpdateInput {
  const existingProps = existing.toProps();
  const orderStartDate = data.startDate ?? existingProps.startDate;
  const orderEndDate = data.endDate ?? existingProps.endDate;
  const update: Prisma.RentalOrderUpdateInput = {};

  if (data.customerId !== undefined) {
    update.customer = { connect: { id: data.customerId } };
  }

  if (data.warehouseId !== undefined) {
    update.warehouse = { connect: { id: data.warehouseId } };
  }

  if (data.remarks !== undefined) {
    update.notes = data.remarks;
  }

  if (data.items !== undefined) {
    const normalizedItems = validateRentalOrderItems(
      data.items,
      orderStartDate,
      orderEndDate,
    );
    const envelope = computeOrderDateEnvelope(normalizedItems);
    const totals = buildPersistenceTotals(normalizedItems);

    update.bookingDate = envelope.startDate;
    update.eventStartDate = envelope.startDate;
    update.eventEndDate = envelope.endDate;
    update.expectedReturnDate = envelope.endDate;
    update.subtotal = totals.subtotal;
    update.grandTotal = totals.grandTotal;
    update.items = {
      deleteMany: {},
      create: normalizedItems.map((item) => toItemCreateInput(item)),
    };
  } else if (data.startDate !== undefined || data.endDate !== undefined) {
    const normalizedItems = validateRentalOrderItems(
      existingProps.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        dailyRate: item.dailyRate,
        startDate: item.startDate,
        endDate: item.endDate,
      })),
      orderStartDate,
      orderEndDate,
    );
    const envelope = computeOrderDateEnvelope(normalizedItems);
    const totals = buildPersistenceTotals(normalizedItems);

    update.bookingDate = envelope.startDate;
    update.eventStartDate = envelope.startDate;
    update.eventEndDate = envelope.endDate;
    update.expectedReturnDate = envelope.endDate;
    update.subtotal = totals.subtotal;
    update.grandTotal = totals.grandTotal;
    update.items = {
      deleteMany: {},
      create: normalizedItems.map((item) => ({
        ...toItemCreateInput(item),
        reservedQuantity:
          existingProps.items.find(
            (existingItem) => existingItem.productId === item.productId,
          )?.reservedQuantity ?? 0,
      })),
    };
  }

  return update;
}

export function toRentalOrderReserveUpdateInput(
  data: UpdateRentalOrderReserveData,
): Prisma.RentalOrderUpdateInput {
  return {
    status: data.status,
    items: {
      update: data.items.map((item) => ({
        where: { id: item.id },
        data: { reservedQuantity: item.reservedQuantity },
      })),
    },
  };
}

export const RENTAL_ORDER_INCLUDE = {
  items: true,
} as const satisfies Prisma.RentalOrderInclude;
