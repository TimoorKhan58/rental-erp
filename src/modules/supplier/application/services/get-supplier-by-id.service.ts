import type { ISupplierRepository } from "@/modules/supplier/domain/supplier.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { SupplierDto } from "../dtos/supplier.dto";
import { toSupplierDto, toSupplierId } from "../mappers/supplier.mapper";
import {
  SupplierIdParamSchema,
  type SupplierIdParamInput,
} from "../schemas/supplier.schemas";

export class GetSupplierByIdService {
  constructor(private readonly repository: ISupplierRepository) {}

  async execute(input: SupplierIdParamInput): Promise<SupplierDto> {
    const params = parseRequest(SupplierIdParamSchema, input);
    const supplier = await this.repository.findById(toSupplierId(params.id));

    if (supplier === null) {
      throw new NotFoundError({
        message: "Supplier not found",
        details: { id: params.id },
      });
    }

    return toSupplierDto(supplier);
  }
}
