export type {
  CreateCustomerDto,
  CustomerDto,
  CustomerIdParamDto,
  UpdateCustomerDto,
} from "./dtos/customer.dto";
export {
  toCreateCustomerData,
  toCreateCustomerDto,
  toCustomerDto,
  toCustomerId,
  toUpdateCustomerData,
} from "./mappers/customer.mapper";
export {
  CreateCustomerSchema,
  CustomerIdParamSchema,
  UpdateCustomerSchema,
  type CreateCustomerInput,
  type CustomerIdParamInput,
  type UpdateCustomerInput,
} from "./schemas/customer.schemas";
export {
  CustomerServicePlaceholder,
  type ICustomerService,
} from "./services/customer.service.interface";
