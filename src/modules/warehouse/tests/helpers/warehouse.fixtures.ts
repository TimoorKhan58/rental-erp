import { Warehouse } from "@/modules/warehouse/domain/warehouse.entity";
import type { CreateWarehouseData } from "@/modules/warehouse/domain/warehouse.types";
import {
  createPhoneNumber,
  createWarehouseCode,
} from "@/modules/warehouse/domain";
import type { WarehouseId } from "@/shared/domain/ids";

export const WAREHOUSE_ID =
  "660e8400-e29b-41d4-a716-446655440000" as WarehouseId;

export const OTHER_WAREHOUSE_ID =
  "660e8400-e29b-41d4-a716-446655440001" as WarehouseId;

export const VALID_CREATE_INPUT = {
  warehouseCode: "WH-001",
  name: "Main Storage Hub",
  description: "Primary warehouse for inventory",
  address: "789 Logistics Park, Karachi",
  contactPerson: "Warehouse Manager",
  phone: "+923001234567",
  isActive: true,
};

export function buildCreateWarehouseData(
  override: Partial<CreateWarehouseData> = {},
): CreateWarehouseData {
  return {
    warehouseCode: createWarehouseCode(VALID_CREATE_INPUT.warehouseCode),
    name: VALID_CREATE_INPUT.name,
    description: VALID_CREATE_INPUT.description,
    address: VALID_CREATE_INPUT.address,
    contactPerson: VALID_CREATE_INPUT.contactPerson,
    phone: createPhoneNumber(VALID_CREATE_INPUT.phone),
    isActive: VALID_CREATE_INPUT.isActive,
    ...override,
  };
}

export function buildWarehouseEntity(
  override: Partial<ReturnType<typeof Warehouse.create>> & {
    id?: WarehouseId;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): Warehouse {
  const created = Warehouse.create(buildCreateWarehouseData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return Warehouse.reconstitute({
    id: override.id ?? WAREHOUSE_ID,
    warehouseCode: override.warehouseCode ?? created.warehouseCode,
    name: override.name ?? created.name,
    description: override.description ?? created.description,
    address: override.address ?? created.address,
    contactPerson: override.contactPerson ?? created.contactPerson,
    phone: override.phone ?? created.phone,
    isActive: override.isActive ?? created.isActive,
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}
