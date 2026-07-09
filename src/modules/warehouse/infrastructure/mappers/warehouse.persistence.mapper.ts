import { Warehouse } from "@/modules/warehouse/domain/warehouse.entity";
import type {
  CreateWarehouseData,
  UpdateWarehouseData,
} from "@/modules/warehouse/domain/warehouse.types";
import {
  createPhoneNumber,
  createWarehouseCode,
} from "@/modules/warehouse/domain";
import type { WarehouseId } from "@/shared/domain/ids";

export function toWarehouseDomain(record: {
  id: string;
  warehouseCode: string;
  name: string;
  description: string | null;
  address: string | null;
  contactPerson: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Warehouse {
  return Warehouse.reconstitute({
    id: record.id as WarehouseId,
    warehouseCode: createWarehouseCode(record.warehouseCode),
    name: record.name,
    description: record.description,
    address: record.address,
    contactPerson: record.contactPerson,
    phone: createPhoneNumber(record.phone),
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toWarehouseCreateInput(data: CreateWarehouseData) {
  return {
    warehouseCode: data.warehouseCode,
    name: data.name,
    description: data.description ?? null,
    address: data.address ?? null,
    contactPerson: data.contactPerson ?? null,
    phone: data.phone ?? null,
    isActive: data.isActive ?? true,
  };
}

export function toWarehouseUpdateInput(data: UpdateWarehouseData) {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.address !== undefined ? { address: data.address } : {}),
    ...(data.contactPerson !== undefined
      ? { contactPerson: data.contactPerson }
      : {}),
    ...(data.phone !== undefined ? { phone: data.phone } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };
}
