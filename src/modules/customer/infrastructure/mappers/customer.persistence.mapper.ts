import { Customer } from "@/modules/customer/domain/customer.entity";
import type {
  CreateCustomerData,
  UpdateCustomerData,
} from "@/modules/customer/domain/customer.types";
import {
  createCnic,
  createCustomerCode,
  createPhoneNumber,
} from "@/modules/customer/domain";
import type { CustomerId } from "@/shared/domain/ids";

export function toCustomerDomain(record: {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  cnic: string | null;
  address: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Customer {
  return Customer.reconstitute({
    id: record.id as CustomerId,
    customerCode: createCustomerCode(record.customerCode),
    name: record.name,
    phone: createPhoneNumber(record.phone),
    cnic: createCnic(record.cnic),
    address: record.address,
    notes: record.notes,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toCustomerCreateInput(data: CreateCustomerData) {
  return {
    customerCode: data.customerCode,
    name: data.name,
    phone: data.phone,
    cnic: data.cnic,
    address: data.address,
    notes: data.notes ?? null,
    isActive: data.isActive ?? true,
  };
}

export function toCustomerUpdateInput(data: UpdateCustomerData) {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.phone !== undefined ? { phone: data.phone } : {}),
    ...(data.cnic !== undefined ? { cnic: data.cnic } : {}),
    ...(data.address !== undefined ? { address: data.address } : {}),
    ...(data.notes !== undefined ? { notes: data.notes } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };
}
