import type { PaginatedResult } from "@/shared/domain/pagination";

import type { ReturnDto } from "../dtos/return.dto";
import type {
  CreateReturnInput,
  InspectReturnInput,
  ReturnIdParamInput,
  UpdateReturnInput,
} from "../schemas/return.schemas";
import type { ListReturnsInput } from "../schemas/list-returns.schema";
import type { IReturnService } from "./return-application-services.interface";
import type { CancelReturnService } from "./cancel-return.service";
import type { CompleteReturnService } from "./complete-return.service";
import type { CreateReturnService } from "./create-return.service";
import type { GetReturnByIdService } from "./get-return-by-id.service";
import type { InspectReturnService } from "./inspect-return.service";
import type { ListReturnsService } from "./list-returns.service";
import type { ReceiveReturnService } from "./receive-return.service";
import type { UpdateReturnService } from "./update-return.service";

export class ReturnService implements IReturnService {
  constructor(
    private readonly getReturnById: GetReturnByIdService,
    private readonly listReturns: ListReturnsService,
    private readonly createReturn: CreateReturnService,
    private readonly updateReturn: UpdateReturnService,
    private readonly receiveReturn: ReceiveReturnService,
    private readonly inspectReturn: InspectReturnService,
    private readonly completeReturn: CompleteReturnService,
    private readonly cancelReturn: CancelReturnService,
  ) {}

  getById(params: ReturnIdParamInput): Promise<ReturnDto> {
    return this.getReturnById.execute(params);
  }

  list(input: ListReturnsInput): Promise<PaginatedResult<ReturnDto>> {
    return this.listReturns.execute(input);
  }

  create(input: CreateReturnInput): Promise<ReturnDto> {
    return this.createReturn.execute(input);
  }

  update(
    params: ReturnIdParamInput,
    input: UpdateReturnInput,
  ): Promise<ReturnDto> {
    return this.updateReturn.execute(params, input);
  }

  receive(params: ReturnIdParamInput): Promise<ReturnDto> {
    return this.receiveReturn.execute(params);
  }

  inspect(
    params: ReturnIdParamInput,
    input: InspectReturnInput,
  ): Promise<ReturnDto> {
    return this.inspectReturn.execute(params, input);
  }

  complete(params: ReturnIdParamInput): Promise<ReturnDto> {
    return this.completeReturn.execute(params);
  }

  cancel(params: ReturnIdParamInput): Promise<ReturnDto> {
    return this.cancelReturn.execute(params);
  }
}
