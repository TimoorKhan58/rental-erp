import type { IReturnRepository } from "@/modules/return/domain";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { ReturnDto } from "../dtos/return.dto";
import { toReturnDto, toReturnId } from "../mappers/return.mapper";
import {
  ReturnIdParamSchema,
  type ReturnIdParamInput,
} from "../schemas/return.schemas";

export class GetReturnByIdService {
  constructor(private readonly repository: IReturnRepository) {}

  async execute(params: ReturnIdParamInput): Promise<ReturnDto> {
    const { id } = parseRequest(ReturnIdParamSchema, params);
    const returnRecord = await this.repository.findById(toReturnId(id));

    if (returnRecord === null) {
      throw new NotFoundError({
        message: "Return not found",
        details: { id },
      });
    }

    return toReturnDto(returnRecord);
  }
}
