import type { PaginatedResult } from "@/shared/domain/pagination";

import type { CustomerDto } from "../dtos/customer.dto";
import type {
  CreateCustomerInput,
  CustomerIdParamInput,
  UpdateCustomerInput,
} from "../schemas/customer.schemas";
import type { ListCustomersInput } from "../schemas/list-customers.schema";
import { CreateCustomerService } from "./create-customer.service";
import { DeleteCustomerService } from "./delete-customer.service";
import { GetCustomerByIdService } from "./get-customer-by-id.service";
import { ListCustomersService } from "./list-customers.service";
import { UpdateCustomerService } from "./update-customer.service";

export interface ICustomerService {
  getById(input: CustomerIdParamInput): Promise<CustomerDto>;
  list(input: ListCustomersInput): Promise<PaginatedResult<CustomerDto>>;
  create(input: CreateCustomerInput): Promise<CustomerDto>;
  update(
    input: CustomerIdParamInput,
    data: UpdateCustomerInput,
  ): Promise<CustomerDto>;
  delete(input: CustomerIdParamInput): Promise<void>;
}

export class CustomerService implements ICustomerService {
  constructor(
    private readonly getCustomerByIdService: GetCustomerByIdService,
    private readonly listCustomersService: ListCustomersService,
    private readonly createCustomerService: CreateCustomerService,
    private readonly updateCustomerService: UpdateCustomerService,
    private readonly deleteCustomerService: DeleteCustomerService,
  ) {}

  getById(input: CustomerIdParamInput): Promise<CustomerDto> {
    return this.getCustomerByIdService.execute(input);
  }

  list(input: ListCustomersInput): Promise<PaginatedResult<CustomerDto>> {
    return this.listCustomersService.execute(input);
  }

  create(input: CreateCustomerInput): Promise<CustomerDto> {
    return this.createCustomerService.execute(input);
  }

  update(
    input: CustomerIdParamInput,
    data: UpdateCustomerInput,
  ): Promise<CustomerDto> {
    return this.updateCustomerService.execute(input, data);
  }

  delete(input: CustomerIdParamInput): Promise<void> {
    return this.deleteCustomerService.execute(input);
  }
}
