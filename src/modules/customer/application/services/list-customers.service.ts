import type { ICustomerRepository } from "@/modules/customer/domain/customer.repository.interface";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { CustomerDto } from "../dtos/customer.dto";
import { toCustomerListQuery } from "../mappers/customer-list.mapper";
import { toCustomerDto } from "../mappers/customer.mapper";
import {
  ListCustomersSchema,
  type ListCustomersInput,
} from "../schemas/list-customers.schema";

export class ListCustomersService {
  constructor(private readonly repository: ICustomerRepository) {}

  async execute(input: ListCustomersInput): Promise<PaginatedResult<CustomerDto>> {
    const query = parseRequest(ListCustomersSchema, input);
    const result = await this.repository.findPaged(toCustomerListQuery(query));

    return {
      items: result.items.map(toCustomerDto),
      meta: result.meta,
    };
  }
}
