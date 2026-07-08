import type { CustomerDto } from "../dtos/customer.dto";
import type {
  CreateCustomerInput,
  CustomerIdParamInput,
  UpdateCustomerInput,
} from "../schemas/customer.schemas";
import type { ListCustomersInput } from "../schemas/list-customers.schema";
import type { ExecutionContext } from "@/shared/application/context";
import type { PaginatedResult } from "@/shared/domain/pagination";

export interface CustomerApplicationServices {
  getCustomerById: {
    execute(input: CustomerIdParamInput): Promise<CustomerDto>;
  };
  listCustomers: {
    execute(input: ListCustomersInput): Promise<PaginatedResult<CustomerDto>>;
  };
  createCustomer: {
    execute(input: CreateCustomerInput): Promise<CustomerDto>;
  };
  updateCustomer: {
    execute(
      params: CustomerIdParamInput,
      input: UpdateCustomerInput,
    ): Promise<CustomerDto>;
  };
  deleteCustomer: {
    execute(input: CustomerIdParamInput): Promise<void>;
  };
}

export type CustomerServiceResolver = (
  ctx: ExecutionContext,
) => CustomerApplicationServices;
