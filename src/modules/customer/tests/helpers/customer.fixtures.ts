import { Customer } from "@/modules/customer/domain/customer.entity";
import type { CreateCustomerData } from "@/modules/customer/domain/customer.types";
import {
  createCnic,
  createCustomerCode,
  createPhoneNumber,
} from "@/modules/customer/domain";
import type { CustomerId } from "@/shared/domain/ids";

export const CUSTOMER_ID =
  "550e8400-e29b-41d4-a716-446655440000" as CustomerId;

export const OTHER_CUSTOMER_ID =
  "550e8400-e29b-41d4-a716-446655440001" as CustomerId;

export const VALID_CREATE_INPUT = {
  customerCode: "CUST-001",
  name: "Manyar Tent Service",
  phone: "+923001234567",
  cnic: "12345-1234567-1",
  address: "123 Main Street, Lahore",
  notes: "Preferred customer",
  isActive: true,
};

export function buildCreateCustomerData(
  override: Partial<CreateCustomerData> = {},
): CreateCustomerData {
  return {
    customerCode: createCustomerCode(VALID_CREATE_INPUT.customerCode),
    name: VALID_CREATE_INPUT.name,
    phone: createPhoneNumber(VALID_CREATE_INPUT.phone),
    cnic: createCnic(VALID_CREATE_INPUT.cnic),
    address: VALID_CREATE_INPUT.address,
    notes: VALID_CREATE_INPUT.notes,
    isActive: VALID_CREATE_INPUT.isActive,
    ...override,
  };
}

export function buildCustomerEntity(
  override: Partial<ReturnType<typeof Customer.create>> & {
    id?: CustomerId;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): Customer {
  const created = Customer.create(buildCreateCustomerData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return Customer.reconstitute({
    id: override.id ?? CUSTOMER_ID,
    customerCode: override.customerCode ?? created.customerCode,
    name: override.name ?? created.name,
    phone: override.phone ?? created.phone,
    cnic: override.cnic ?? created.cnic,
    address: override.address ?? created.address,
    notes: override.notes ?? created.notes,
    isActive: override.isActive ?? created.isActive,
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}
