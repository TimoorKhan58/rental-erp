import type { ReturnInspectionId } from "@/shared/domain/ids";
import type { ProductId } from "@/shared/domain/ids";
import type { WarehouseId } from "@/shared/domain/ids";

import type { RepairSortField, RepairStatus } from "./repair.constants";

export interface RepairListQuery {
  page: number;
  pageSize: number;
  sortBy?: RepairSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: RepairStatus;
  returnId?: ReturnInspectionId;
  productId?: ProductId;
  warehouseId?: WarehouseId;
}
