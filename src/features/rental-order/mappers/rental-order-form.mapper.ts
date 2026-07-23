import type {
  CreateRentalOrderFormValues,
  UpdateRentalOrderFormValues,
} from "../schemas";
import type {
  CreateRentalOrderPayload,
  RentalOrderResponse,
  UpdateRentalOrderPayload,
} from "../types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function toLinePayload(
  item: CreateRentalOrderFormValues["items"][number],
  orderStartDate: string,
  orderEndDate: string,
) {
  return {
    productId: item.productId,
    quantity: item.quantity,
    dailyRate: item.dailyRate,
    startDate: item.useCustomDates ? item.startDate : undefined,
    endDate: item.useCustomDates ? item.endDate : undefined,
  };
}

export function toCreateRentalOrderPayload(
  values: CreateRentalOrderFormValues,
): CreateRentalOrderPayload {
  return {
    orderNumber: values.orderNumber.trim(),
    customerId: values.customerId,
    warehouseId: values.warehouseId,
    startDate: values.startDate,
    endDate: values.endDate,
    remarks: normalizeOptionalString(values.remarks),
    items: values.items.map((item) =>
      toLinePayload(item, values.startDate, values.endDate),
    ),
  };
}

export function toUpdateRentalOrderPayload(
  values: UpdateRentalOrderFormValues,
): UpdateRentalOrderPayload {
  return {
    customerId: values.customerId,
    warehouseId: values.warehouseId,
    startDate: values.startDate,
    endDate: values.endDate,
    remarks: normalizeOptionalString(values.remarks),
    items: values.items.map((item) =>
      toLinePayload(item, values.startDate, values.endDate),
    ),
  };
}

export function toRentalOrderFormValues(
  order: RentalOrderResponse,
): UpdateRentalOrderFormValues {
  return {
    customerId: order.customerId,
    warehouseId: order.warehouseId,
    startDate: order.startDate,
    endDate: order.endDate,
    remarks: order.remarks ?? "",
    items: order.items.map((item) => {
      const matchesOrderDates =
        item.startDate === order.startDate && item.endDate === order.endDate;

      return {
        productId: item.productId,
        quantity: item.quantity,
        dailyRate: item.dailyRate,
        useCustomDates: !matchesOrderDates,
        startDate: item.startDate,
        endDate: item.endDate,
      };
    }),
  };
}
