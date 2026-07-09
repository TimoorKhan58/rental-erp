import type { Return } from "@/modules/return/domain";
import type { IRepairRepository } from "@/modules/repair/domain";
import {
  RepairInvalidItemError,
  assertReturnEligibleForRepair,
  validateRepairQuantityAgainstReturn,
} from "@/modules/repair/domain";
import { UnprocessableError } from "@/shared/infrastructure/errors";

function buildPriorRepairedMap(
  repairs: Awaited<ReturnType<IRepairRepository["findByReturnId"]>>,
  excludeRepairId?: string,
): Map<string, number> {
  const map = new Map<string, number>();

  for (const repair of repairs) {
    if (excludeRepairId !== undefined && repair.id === excludeRepairId) {
      continue;
    }

    if (repair.status === "CANCELLED") {
      continue;
    }

    const existing = map.get(repair.returnItemId) ?? 0;
    map.set(repair.returnItemId, existing + repair.quantity);
  }

  return map;
}

export function validateReturnForRepair(returnRecord: Return): void {
  try {
    assertReturnEligibleForRepair(returnRecord.status);
  } catch (error) {
    if (error instanceof RepairInvalidItemError) {
      throw new UnprocessableError({ message: error.message });
    }

    throw error;
  }
}

export function validateRepairAgainstReturnItem(
  returnRecord: Return,
  returnItemId: string,
  _productId: string,
  _warehouseId: string,
  quantity: number,
  priorRepairs: Awaited<ReturnType<IRepairRepository["findByReturnId"]>>,
  excludeRepairId?: string,
): void {
  const returnItem = returnRecord.items.find((item) => item.id === returnItemId);

  if (returnItem === undefined) {
    throw new UnprocessableError({
      message: "Return item not found",
      details: { returnItemId },
    });
  }

  if (returnItem.damagedQuantity <= 0) {
    throw new UnprocessableError({
      message: "Return item has no damaged quantity available for repair",
      details: { returnItemId },
    });
  }

  const priorRepaired =
    buildPriorRepairedMap(priorRepairs, excludeRepairId).get(returnItemId) ?? 0;

  try {
    validateRepairQuantityAgainstReturn(
      quantity,
      returnItem.damagedQuantity,
      priorRepaired,
      returnItemId,
    );
  } catch (error) {
    if (error instanceof RepairInvalidItemError) {
      throw new UnprocessableError({
        message: error.message,
        details:
          error.returnInspectionItemId !== undefined
            ? { returnItemId: error.returnInspectionItemId }
            : undefined,
      });
    }

    throw error;
  }
}

import type { ReturnInspectionId } from "@/shared/domain/ids";

export async function loadPriorRepairsForReturn(
  repairRepository: IRepairRepository,
  returnId: ReturnInspectionId,
): Promise<Awaited<ReturnType<IRepairRepository["findByReturnId"]>>> {
  return repairRepository.findByReturnId(returnId);
}

export { buildPriorRepairedMap };
