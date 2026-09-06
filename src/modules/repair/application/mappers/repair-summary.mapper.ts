import type {
  ProductId,
  ReturnInspectionId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { GetRepairSummaryInput } from "../schemas/get-repair-summary.schema";

export function toRepairSummaryQuery(input: GetRepairSummaryInput) {
  return {
    search: input.search,
    status: input.status,
    returnId: input.returnId as ReturnInspectionId | undefined,
    productId: input.productId as ProductId | undefined,
    warehouseId: input.warehouseId as WarehouseId | undefined,
    repairDateFrom: input.repairDateFrom,
    repairDateTo: input.repairDateTo,
    technician: input.technician,
  };
}
