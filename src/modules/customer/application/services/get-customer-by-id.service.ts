import type { ICustomerRepository } from "@/modules/customer/domain/customer.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { CustomerDto } from "../dtos/customer.dto";
import { toCustomerDto, toCustomerId } from "../mappers/customer.mapper";
import {
  CustomerIdParamSchema,
  type CustomerIdParamInput,
} from "../schemas/customer.schemas";

export class GetCustomerByIdService {
  constructor(private readonly repository: ICustomerRepository) {}

  async execute(input: CustomerIdParamInput): Promise<CustomerDto> {
    const params = parseRequest(CustomerIdParamSchema, input);
    const customer = await this.repository.findById(toCustomerId(params.id));

    if (customer === null) {
      throw new NotFoundError({
        message: "Customer not found",
        details: { id: params.id },
      });
    }

    return toCustomerDto(customer);
  }
}
