import type { ISupplierRepository } from "@/modules/supplier/domain/supplier.repository.interface";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { SupplierDto } from "../dtos/supplier.dto";
import { toSupplierListQuery } from "../mappers/supplier-list.mapper";
import { toSupplierDto } from "../mappers/supplier.mapper";
import {
  ListSuppliersSchema,
  type ListSuppliersInput,
} from "../schemas/list-suppliers.schema";

export class ListSuppliersService {
  constructor(private readonly repository: ISupplierRepository) {}

  async execute(input: ListSuppliersInput): Promise<PaginatedResult<SupplierDto>> {
    const query = parseRequest(ListSuppliersSchema, input);
    const result = await this.repository.findPaged(toSupplierListQuery(query));

    return {
      items: result.items.map(toSupplierDto),
      meta: result.meta,
    };
  }
}
