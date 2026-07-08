import type { CustomerCode } from "./value-objects/customer-code.vo";
import type { Cnic } from "./value-objects/cnic.vo";
import type { PhoneNumber } from "./value-objects/phone.vo";

export interface CreateCustomerData {
  customerCode: CustomerCode;
  name: string;
  phone: PhoneNumber;
  cnic?: Cnic | null;
  address: string;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpdateCustomerData {
  name?: string;
  phone?: PhoneNumber;
  cnic?: Cnic | null;
  address?: string;
  notes?: string | null;
  isActive?: boolean;
}
