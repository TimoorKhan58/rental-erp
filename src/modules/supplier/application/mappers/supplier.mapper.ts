import type { Supplier } from "@/modules/supplier/domain/supplier.entity";
import type {
  CreateSupplierData,
  UpdateSupplierData,
} from "@/modules/supplier/domain/supplier.types";
import type { SupplierId } from "@/shared/domain/ids";

import type {
  CreateSupplierDto,
  SupplierDto,
} from "../dtos/supplier.dto";
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
} from "../schemas/supplier.schemas";
import {
  createEmail,
  createPhoneNumber,
  createSupplierCode,
} from "@/modules/supplier/domain";

export function toSupplierDto(supplier: Supplier): SupplierDto {
  const props = supplier.toProps();

  return {
    id: props.id,
    supplierCode: props.supplierCode,
    name: props.name,
    phone: props.phone,
    email: props.email,
    address: props.address,
    notes: props.notes,
    isActive: props.isActive,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateSupplierData(input: CreateSupplierInput): CreateSupplierData {
  return {
    supplierCode: createSupplierCode(input.supplierCode),
    name: input.name,
    phone: createPhoneNumber(input.phone),
    email: createEmail(input.email),
    address: input.address,
    notes: input.notes,
    isActive: input.isActive,
  };
}

export function toUpdateSupplierData(input: UpdateSupplierInput): UpdateSupplierData {
  return {
    name: input.name,
    phone: input.phone !== undefined ? createPhoneNumber(input.phone) : undefined,
    email: input.email !== undefined ? createEmail(input.email) : undefined,
    address: input.address,
    notes: input.notes,
    isActive: input.isActive,
  };
}

export function toCreateSupplierDto(dto: CreateSupplierDto): CreateSupplierInput {
  return dto;
}

export function toSupplierId(id: string): SupplierId {
  return id as SupplierId;
}
