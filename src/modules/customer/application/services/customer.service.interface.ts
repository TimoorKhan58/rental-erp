import type { CustomerDto } from "../dtos/customer.dto";
import type {
  CreateCustomerInput,
  CustomerIdParamInput,
  UpdateCustomerInput,
} from "../schemas/customer.schemas";

/**
 * Customer application service contract.
 * CRUD operations will be implemented in Phase 5-002.
 */
export interface ICustomerService {
  getById(input: CustomerIdParamInput): Promise<CustomerDto>;
  create(input: CreateCustomerInput): Promise<CustomerDto>;
  update(input: CustomerIdParamInput, data: UpdateCustomerInput): Promise<CustomerDto>;
  delete(input: CustomerIdParamInput): Promise<void>;
}

/**
 * Placeholder service — not implemented until Phase 5-002.
 */
export class CustomerServicePlaceholder implements ICustomerService {
  getById(input: CustomerIdParamInput): Promise<CustomerDto> {
    void input;
    return Promise.reject(
      new Error("CustomerService.getById is not implemented — Phase 5-002"),
    );
  }

  create(input: CreateCustomerInput): Promise<CustomerDto> {
    void input;
    return Promise.reject(
      new Error("CustomerService.create is not implemented — Phase 5-002"),
    );
  }

  update(input: CustomerIdParamInput, data: UpdateCustomerInput): Promise<CustomerDto> {
    void input;
    void data;
    return Promise.reject(
      new Error("CustomerService.update is not implemented — Phase 5-002"),
    );
  }

  delete(input: CustomerIdParamInput): Promise<void> {
    void input;
    return Promise.reject(
      new Error("CustomerService.delete is not implemented — Phase 5-002"),
    );
  }
}
