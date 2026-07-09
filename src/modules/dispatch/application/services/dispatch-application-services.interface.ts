import type { PaginatedResult } from "@/shared/domain/pagination";

import type { DispatchDto } from "../dtos/dispatch.dto";
import type {
  CreateDispatchInput,
  DispatchIdParamInput,
  UpdateDispatchInput,
} from "../schemas/dispatch.schemas";
import type { ListDispatchesInput } from "../schemas/list-dispatches.schema";
import type { CancelDispatchService } from "./cancel-dispatch.service";
import type { CompleteDispatchService } from "./complete-dispatch.service";
import type { CreateDispatchService } from "./create-dispatch.service";
import type { GetDispatchByIdService } from "./get-dispatch-by-id.service";
import type { ListDispatchesService } from "./list-dispatches.service";
import type { UpdateDispatchService } from "./update-dispatch.service";

export interface DispatchApplicationServices {
  getDispatchById: GetDispatchByIdService;
  listDispatches: ListDispatchesService;
  createDispatch: CreateDispatchService;
  updateDispatch: UpdateDispatchService;
  completeDispatch: CompleteDispatchService;
  cancelDispatch: CancelDispatchService;
}

export interface IDispatchService {
  getById(params: DispatchIdParamInput): Promise<DispatchDto>;
  list(input: ListDispatchesInput): Promise<PaginatedResult<DispatchDto>>;
  create(input: CreateDispatchInput): Promise<DispatchDto>;
  update(
    params: DispatchIdParamInput,
    input: UpdateDispatchInput,
  ): Promise<DispatchDto>;
  complete(params: DispatchIdParamInput): Promise<DispatchDto>;
  cancel(params: DispatchIdParamInput): Promise<DispatchDto>;
}

export type DispatchServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => DispatchApplicationServices;
