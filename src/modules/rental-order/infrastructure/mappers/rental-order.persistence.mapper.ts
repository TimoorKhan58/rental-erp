import { Prisma } from "@/generated/prisma/client";
import { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import {
  RENTAL_ORDER_STATUSES,
  type RentalOrderStatus,
} from "@/modules/rental-order/domain/rental-order.constants";
import {
  computeLineTotal,
  computeRentalDays,
  validateRentalOrderItems,
} from "@/modules/rental-order/domain/rental-order.rules";
import type {
  CreateRentalOrderData,
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
    items: record.items.map((item) => ({
      id: item.id,
      productId: item.productId as ProductId,
      quantity: item.quantity,
      dailyRate: decimalToNumber(item.rentalPricePerDay),
      reservedQuantity: item.reservedQuantity,
    })),
    createdById: record.createdById as UserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

function buildPersistenceTotals(
  items: ReturnType<typeof validateRentalOrderItems>,
  numberOfDays: number,
): { subtotal: Prisma.Decimal; grandTotal: Prisma.Decimal } {
  const subtotal = items.reduce(
    (sum, item) => sum + computeLineTotal(item.quantity, item.dailyRate, numberOfDays),
    0,
  );

  const decimal = toPrismaDecimal(subtotal);
  return { subtotal: decimal, grandTotal: decimal };
}

export function toRentalOrderCreateInput(
  data: CreateRentalOrderData,
): Prisma.RentalOrderCreateInput {
  const normalized = RentalOrder.create(data);
  const numberOfDays = computeRentalDays(normalized.startDate, normalized.endDate);
  const totals = buildPersistenceTotals(normalized.items, numberOfDays);

  return {
    orderNumber: normalized.orderNumber,
    customer: { connect: { id: normalized.customerId } },
    warehouse: { connect: { id: normalized.warehouseId } },
    status: "DRAFT",
    bookingDate: normalized.startDate,
    eventStartDate: normalized.startDate,
    eventEndDate: normalized.endDate,
    expectedReturnDate: normalized.endDate,
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
      create: normalized.items.map((item) => ({
        product: { connect: { id: item.productId } },
        quantity: item.quantity,
        rentalPricePerDay: toPrismaDecimal(item.dailyRate),
        reservedQuantity: 0,
        numberOfDays,
        lineTotal: toPrismaDecimal(
          computeLineTotal(item.quantity, item.dailyRate, numberOfDays),
        ),
      })),
    },
  };
}

export function toRentalOrderUpdateInput(
  data: UpdateRentalOrderData,
  existing: RentalOrder,
): Prisma.RentalOrderUpdateInput {
  const existingProps = existing.toProps();
  const startDate = data.startDate ?? existingProps.startDate;
  const endDate = data.endDate ?? existingProps.endDate;
  const numberOfDays = computeRentalDays(startDate, endDate);
  const update: Prisma.RentalOrderUpdateInput = {};

  if (data.customerId !== undefined) {
    update.customer = { connect: { id: data.customerId } };
  }

  if (data.warehouseId !== undefined) {
    update.warehouse = { connect: { id: data.warehouseId } };
  }

  if (data.startDate !== undefined) {
    update.bookingDate = data.startDate;
    update.eventStartDate = data.startDate;
  }

  if (data.endDate !== undefined) {
    update.eventEndDate = data.endDate;
    update.expectedReturnDate = data.endDate;
  }

  if (data.remarks !== undefined) {
    update.notes = data.remarks;
  }

  if (data.items !== undefined) {
    const normalizedItems = validateRentalOrderItems(data.items);
    const totals = buildPersistenceTotals(normalizedItems, numberOfDays);

    update.subtotal = totals.subtotal;
    update.grandTotal = totals.grandTotal;
    update.items = {
      deleteMany: {},
      create: normalizedItems.map((item) => ({
        product: { connect: { id: item.productId } },
        quantity: item.quantity,
        rentalPricePerDay: toPrismaDecimal(item.dailyRate),
        reservedQuantity: 0,
        numberOfDays,
        lineTotal: toPrismaDecimal(
          computeLineTotal(item.quantity, item.dailyRate, numberOfDays),
        ),
      })),
    };
  } else if (data.startDate !== undefined || data.endDate !== undefined) {
    const totals = buildPersistenceTotals(existingProps.items, numberOfDays);
    update.subtotal = totals.subtotal;
    update.grandTotal = totals.grandTotal;
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
