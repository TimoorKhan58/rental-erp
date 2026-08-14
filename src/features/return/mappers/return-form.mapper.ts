import type {
  CreateReturnFormValues,
  InspectReturnFormValues,
  UpdateReturnFormValues,
} from "../schemas";
import type {
  CreateReturnPayload,
  InspectReturnPayload,
  ReturnResponse,
  UpdateReturnPayload,
} from "../types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function normalizeDispatchItemId(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function toLineItemPayload(
  item: CreateReturnFormValues["items"][number],
): CreateReturnPayload["items"][number] {
  const payload: CreateReturnPayload["items"][number] = {
    rentalOrderItemId: item.rentalOrderItemId,
    dispatchItemId: normalizeDispatchItemId(item.dispatchItemId),
    quantity: item.quantity,
    notes: normalizeOptionalString(item.notes),
  };

  if (item.requiresSourceSplit) {
    payload.ownedQuantity = item.ownedQuantity ?? 0;
    payload.externalQuantity = item.externalQuantity ?? 0;
  } else if (item.ownedQuantity != null || item.externalQuantity != null) {
    payload.ownedQuantity = item.ownedQuantity ?? 0;
    payload.externalQuantity = item.externalQuantity ?? 0;
  }

  return payload;
}

export function toCreateReturnPayload(values: CreateReturnFormValues): CreateReturnPayload {
  return {
    ...(values.returnNumber?.trim()
      ? { returnNumber: values.returnNumber.trim() }
      : {}),
    rentalOrderId: values.rentalOrderId,
    dispatchId: values.dispatchId,
    returnDate: values.returnDate,
    remarks: normalizeOptionalString(values.remarks),
    items: values.items.map(toLineItemPayload),
  };
}

export function toUpdateReturnPayload(values: UpdateReturnFormValues): UpdateReturnPayload {
  return {
    returnDate: values.returnDate,
    remarks: normalizeOptionalString(values.remarks),
    items: values.items.map(toLineItemPayload),
  };
}

export function toInspectReturnPayload(values: InspectReturnFormValues): InspectReturnPayload {
  return {
    items: values.items.map((item) => {
      if (item.requiresSourceCondition) {
        const ownedGood = item.ownedGoodQuantity ?? 0;
        const ownedDamaged = item.ownedDamagedQuantity ?? 0;
        const ownedLost = item.ownedLostQuantity ?? 0;
        const externalGood = item.externalGoodQuantity ?? 0;
        const externalDamaged = item.externalDamagedQuantity ?? 0;
        const externalLost = item.externalLostQuantity ?? 0;

        return {
          rentalOrderItemId: item.rentalOrderItemId,
          goodQuantity: ownedGood + externalGood,
          damagedQuantity: ownedDamaged + externalDamaged,
          lostQuantity: ownedLost + externalLost,
          missingQuantity: 0,
          ownedGoodQuantity: ownedGood,
          ownedDamagedQuantity: ownedDamaged,
          ownedLostQuantity: ownedLost,
          externalGoodQuantity: externalGood,
          externalDamagedQuantity: externalDamaged,
          externalLostQuantity: externalLost,
          notes: normalizeOptionalString(item.notes),
        };
      }

      return {
        rentalOrderItemId: item.rentalOrderItemId,
        goodQuantity: item.goodQuantity,
        damagedQuantity: item.damagedQuantity,
        lostQuantity: item.lostQuantity,
        missingQuantity: item.missingQuantity,
        notes: normalizeOptionalString(item.notes),
      };
    }),
  };
}

export function toReturnFormValues(returnRecord: ReturnResponse): UpdateReturnFormValues {
  return {
    returnDate: returnRecord.returnDate,
    remarks: returnRecord.remarks ?? "",
    items: returnRecord.items.map((item) => {
      const owned = item.ownedQuantity;
      const external = item.externalQuantity;
      const mixed =
        owned != null && external != null && owned > 0 && external > 0;

      return {
        rentalOrderItemId: item.rentalOrderItemId,
        dispatchItemId: item.dispatchItemId ?? "",
        quantity: item.returnedQuantity,
        ownedQuantity: owned,
        externalQuantity: external,
        requiresSourceSplit: mixed,
        notes: item.notes ?? "",
      };
    }),
  };
}

export function toInspectFormValues(returnRecord: ReturnResponse): InspectReturnFormValues {
  return {
    items: returnRecord.items.map((item) => {
      const owned = item.ownedQuantity ?? 0;
      const external = item.externalQuantity ?? 0;
      const mixed =
        item.ownedQuantity != null &&
        item.externalQuantity != null &&
        owned > 0 &&
        external > 0;

      return {
        rentalOrderItemId: item.rentalOrderItemId,
        returnedQuantity: item.returnedQuantity,
        ownedQuantity: item.ownedQuantity,
        externalQuantity: item.externalQuantity,
        requiresSourceCondition: mixed,
        goodQuantity: item.goodQuantity,
        damagedQuantity: item.damagedQuantity,
        lostQuantity: item.lostQuantity,
        missingQuantity: item.missingQuantity ?? 0,
        ownedGoodQuantity: mixed
          ? item.ownedGoodQuantity || owned
          : item.ownedGoodQuantity,
        ownedDamagedQuantity: item.ownedDamagedQuantity,
        ownedLostQuantity: item.ownedLostQuantity,
        externalGoodQuantity: mixed
          ? item.externalGoodQuantity || external
          : item.externalGoodQuantity,
        externalDamagedQuantity: item.externalDamagedQuantity,
        externalLostQuantity: item.externalLostQuantity,
        notes: item.notes ?? "",
      };
    }),
  };
}

export function computePriorReturnedByItem(
  returns: ReturnResponse[],
  excludeReturnId?: string,
): Map<string, number> {
  const totals = new Map<string, number>();

  for (const returnRecord of returns) {
    if (returnRecord.status === "CANCELLED") {
      continue;
    }

    if (excludeReturnId && returnRecord.id === excludeReturnId) {
      continue;
    }

    for (const item of returnRecord.items) {
      const current = totals.get(item.rentalOrderItemId) ?? 0;
      totals.set(item.rentalOrderItemId, current + item.returnedQuantity);
    }
  }

  return totals;
}

export function computePriorSourceReturnedByItem(
  returns: ReturnResponse[],
  excludeReturnId?: string,
): Map<string, { owned: number; external: number }> {
  const totals = new Map<string, { owned: number; external: number }>();

  for (const returnRecord of returns) {
    if (returnRecord.status === "CANCELLED") {
      continue;
    }

    if (excludeReturnId && returnRecord.id === excludeReturnId) {
      continue;
    }

    for (const item of returnRecord.items) {
      const current = totals.get(item.rentalOrderItemId) ?? {
        owned: 0,
        external: 0,
      };
      const owned =
        item.ownedQuantity === null || item.ownedQuantity === undefined
          ? item.returnedQuantity
          : item.ownedQuantity;
      const external =
        item.externalQuantity === null || item.externalQuantity === undefined
          ? 0
          : item.externalQuantity;
      totals.set(item.rentalOrderItemId, {
        owned: current.owned + owned,
        external: current.external + external,
      });
    }
  }

  return totals;
}
