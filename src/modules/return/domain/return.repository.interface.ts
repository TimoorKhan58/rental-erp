import type { DispatchId, ReturnInspectionId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Return } from "./return.entity";
import type { ReturnListQuery } from "./return-list.query";
import type {
  CreateReturnData,
  UpdateReturnData,
  UpdateReturnStatusData,
} from "./return.types";

export interface IReturnRepository {
  findById(id: ReturnInspectionId): Promise<Return | null>;
  findByReturnNumber(returnNumber: string): Promise<Return | null>;
  findByDispatchId(dispatchId: DispatchId): Promise<Return[]>;
  findPaged(query: ReturnListQuery): Promise<PaginatedResult<Return>>;
  create(data: CreateReturnData): Promise<Return>;
  update(id: ReturnInspectionId, data: UpdateReturnData): Promise<Return>;
  updateStatus(
    id: ReturnInspectionId,
    data: UpdateReturnStatusData,
  ): Promise<Return>;
}
