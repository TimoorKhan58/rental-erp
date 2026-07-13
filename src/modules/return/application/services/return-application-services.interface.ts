import type { PaginatedResult } from "@/shared/domain/pagination";

import type { ReturnDto } from "../dtos/return.dto";
import type {
  CreateReturnInput,
  InspectReturnInput,
  RecoverLostReturnInput,
  ReturnIdParamInput,
  UpdateReturnInput,
} from "../schemas/return.schemas";
import type { ListReturnsInput } from "../schemas/list-returns.schema";
import type { CancelReturnService } from "./cancel-return.service";
import type { CompleteReturnService } from "./complete-return.service";
import type { CreateReturnService } from "./create-return.service";
import type { GetReturnByIdService } from "./get-return-by-id.service";
import type { InspectReturnService } from "./inspect-return.service";
import type { ListReturnsService } from "./list-returns.service";
import type { ReceiveReturnService } from "./receive-return.service";
import type {
  RecoverLostItemsService,
  RecoverLostReturnResult,
} from "./recover-lost-items.service";
import type { UpdateReturnService } from "./update-return.service";

export interface ReturnApplicationServices {
  getReturnById: GetReturnByIdService;
  listReturns: ListReturnsService;
  createReturn: CreateReturnService;
  updateReturn: UpdateReturnService;
  receiveReturn: ReceiveReturnService;
  inspectReturn: InspectReturnService;
  completeReturn: CompleteReturnService;
  recoverLostItems: RecoverLostItemsService;
  cancelReturn: CancelReturnService;
}

export interface IReturnService {
  getById(params: ReturnIdParamInput): Promise<ReturnDto>;
  list(input: ListReturnsInput): Promise<PaginatedResult<ReturnDto>>;
  create(input: CreateReturnInput): Promise<ReturnDto>;
  update(
    params: ReturnIdParamInput,
    input: UpdateReturnInput,
  ): Promise<ReturnDto>;
  receive(params: ReturnIdParamInput): Promise<ReturnDto>;
  inspect(
    params: ReturnIdParamInput,
    input: InspectReturnInput,
  ): Promise<ReturnDto>;
  complete(params: ReturnIdParamInput): Promise<ReturnDto>;
  recoverLost(
    params: ReturnIdParamInput,
    input: RecoverLostReturnInput,
  ): Promise<RecoverLostReturnResult>;
  cancel(params: ReturnIdParamInput): Promise<ReturnDto>;
}

export type ReturnServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => ReturnApplicationServices;
