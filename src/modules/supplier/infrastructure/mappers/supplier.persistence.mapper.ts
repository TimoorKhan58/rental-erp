import { Supplier } from "@/modules/supplier/domain/supplier.entity";
import type {
  CreateSupplierData,
  UpdateSupplierData,
} from "@/modules/supplier/domain/supplier.types";
import {
  createEmail,
  createPhoneNumber,
  createSupplierCode,
} from "@/modules/supplier/domain";
import type { SupplierId } from "@/shared/domain/ids";

export function toSupplierDomain(record: {
  id: string;
  supplierCode: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Supplier {
  return Supplier.reconstitute({
    id: record.id as SupplierId,
    supplierCode: createSupplierCode(record.supplierCode),
    name: record.name,
    phone: createPhoneNumber(record.phone),
    email: createEmail(record.email),
    address: record.address,
    notes: record.notes,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toSupplierCreateInput(data: CreateSupplierData) {
  return {
    supplierCode: data.supplierCode,
    name: data.name,
    phone: data.phone,
    email: data.email,
    address: data.address,
    notes: data.notes ?? null,
    isActive: data.isActive ?? true,
  };
}

export function toSupplierUpdateInput(data: UpdateSupplierData) {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.phone !== undefined ? { phone: data.phone } : {}),
    ...(data.email !== undefined ? { email: data.email } : {}),
    ...(data.address !== undefined ? { address: data.address } : {}),
    ...(data.notes !== undefined ? { notes: data.notes } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };
}
