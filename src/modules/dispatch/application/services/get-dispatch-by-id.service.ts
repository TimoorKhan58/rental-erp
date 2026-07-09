import type { IDispatchRepository } from "@/modules/dispatch/domain";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { DispatchDto } from "../dtos/dispatch.dto";
import { toDispatchDto, toDispatchId } from "../mappers/dispatch.mapper";
import {
  DispatchIdParamSchema,
  type DispatchIdParamInput,
} from "../schemas/dispatch.schemas";

export class GetDispatchByIdService {
  constructor(private readonly repository: IDispatchRepository) {}

  async execute(params: DispatchIdParamInput): Promise<DispatchDto> {
    const { id } = parseRequest(DispatchIdParamSchema, params);
    const dispatch = await this.repository.findById(toDispatchId(id));

    if (dispatch === null) {
      throw new NotFoundError({
        message: "Dispatch not found",
        details: { id },
      });
    }

    return toDispatchDto(dispatch);
  }
}
