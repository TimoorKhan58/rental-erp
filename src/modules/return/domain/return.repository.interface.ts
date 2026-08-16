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
  /**
   * Phase 29 (F-01): atomically claims a status transition using an
   * expected-status predicate. Returns the updated return on success,
   * or null when zero rows match. Callers should translate a null result
   * into ConcurrentUpdateError (HTTP 409) so once-only completion side
   * effects (owned RELEASE/IN, external custody counters, audit,
   * notifications) run at most once across concurrent completions.
   */
  claimStatusTransition(
    id: ReturnInspectionId,
    expected: Return["status"] | ReadonlyArray<Return["status"]>,
    data: UpdateReturnStatusData,
  ): Promise<Return | null>;
}
