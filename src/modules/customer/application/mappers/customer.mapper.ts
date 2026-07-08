import type { Customer } from "@/modules/customer/domain/customer.entity";
import type {
  CreateCustomerData,
  UpdateCustomerData,
} from "@/modules/customer/domain/customer.types";
import type { CustomerId } from "@/shared/domain/ids";

import type {
  CreateCustomerDto,
  CustomerDto,
} from "../dtos/customer.dto";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "../schemas/customer.schemas";
import {
  createCnic,
  createCustomerCode,
  createPhoneNumber,
} from "@/modules/customer/domain";

export function toCustomerDto(customer: Customer): CustomerDto {
  const props = customer.toProps();

  return {
    id: props.id,
    customerCode: props.customerCode,
    name: props.name,
    phone: props.phone,
    cnic: props.cnic,
    address: props.address,
    notes: props.notes,
    isActive: props.isActive,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateCustomerData(input: CreateCustomerInput): CreateCustomerData {
  return {
    customerCode: createCustomerCode(input.customerCode),
    name: input.name,
    phone: createPhoneNumber(input.phone),
    cnic: createCnic(input.cnic),
    address: input.address,
    notes: input.notes,
    isActive: input.isActive,
  };
}

export function toUpdateCustomerData(input: UpdateCustomerInput): UpdateCustomerData {
  return {
    name: input.name,
    phone: input.phone !== undefined ? createPhoneNumber(input.phone) : undefined,
    cnic: input.cnic !== undefined ? createCnic(input.cnic) : undefined,
    address: input.address,
    notes: input.notes,
    isActive: input.isActive,
  };
}

export function toCreateCustomerDto(dto: CreateCustomerDto): CreateCustomerInput {
  return dto;
}

export function toCustomerId(id: string): CustomerId {
  return id as CustomerId;
}
