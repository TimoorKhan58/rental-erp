export { Supplier, type SupplierProps } from "./supplier.entity";
export {
  SupplierDomainError,
  SupplierInvariantError,
} from "./supplier.errors";
export {
  SUPPLIER_ENTITY_NAME,
  SUPPLIER_MODULE,
  SUPPLIER_SEARCH_FIELDS,
  SUPPLIER_SORT_FIELDS,
  type SupplierSortField,
} from "./supplier.constants";
export type { SupplierListQuery } from "./supplier-list.query";
export type { ISupplierRepository } from "./supplier.repository.interface";
export type { CreateSupplierData, UpdateSupplierData } from "./supplier.types";
export {
  createSupplierCode,
  type SupplierCode,
} from "./value-objects/supplier-code.vo";
export { createEmail, type Email } from "./value-objects/email.vo";
export {
  createPhoneNumber,
  type PhoneNumber,
} from "./value-objects/phone.vo";
