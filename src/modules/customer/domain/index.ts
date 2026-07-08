export { Customer, type CustomerProps } from "./customer.entity";
export {
  CustomerDomainError,
  CustomerInvariantError,
} from "./customer.errors";
export {
  CUSTOMER_ENTITY_NAME,
  CUSTOMER_MODULE,
  CUSTOMER_SEARCH_FIELDS,
  CUSTOMER_SORT_FIELDS,
  type CustomerSortField,
} from "./customer.constants";
export type { CustomerListQuery } from "./customer-list.query";
export type { ICustomerRepository } from "./customer.repository.interface";
export type { CreateCustomerData, UpdateCustomerData } from "./customer.types";
export {
  createCustomerCode,
  type CustomerCode,
} from "./value-objects/customer-code.vo";
export { createCnic, type Cnic } from "./value-objects/cnic.vo";
export {
  createPhoneNumber,
  type PhoneNumber,
} from "./value-objects/phone.vo";
