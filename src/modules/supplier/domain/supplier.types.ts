import type { Email } from "./value-objects/email.vo";
import type { PhoneNumber } from "./value-objects/phone.vo";
import type { SupplierCode } from "./value-objects/supplier-code.vo";

export interface CreateSupplierData {
  supplierCode: SupplierCode;
  name: string;
  phone: PhoneNumber;
  email?: Email | null;
  address: string;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpdateSupplierData {
  name?: string;
  phone?: PhoneNumber;
  email?: Email | null;
  address?: string;
  notes?: string | null;
  isActive?: boolean;
}
