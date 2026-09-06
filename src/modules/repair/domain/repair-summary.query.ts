import type {
  ProductId,
  ReturnInspectionId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { RepairStatus } from "./repair.constants";

export interface RepairSummaryQuery {
  search?: string;
  status?: RepairStatus;
  returnId?: ReturnInspectionId;
  productId?: ProductId;
  warehouseId?: WarehouseId;
  repairDateFrom?: Date;
  repairDateTo?: Date;
  technician?: string;
}
