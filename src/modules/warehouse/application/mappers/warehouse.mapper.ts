import type { Warehouse } from "@/modules/warehouse/domain/warehouse.entity";
import type {
  CreateWarehouseData,
  UpdateWarehouseData,
} from "@/modules/warehouse/domain/warehouse.types";
import type { WarehouseId } from "@/shared/domain/ids";

import type {
  CreateWarehouseDto,
  WarehouseDto,
} from "../dtos/warehouse.dto";
import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
} from "../schemas/warehouse.schemas";
import {
  createPhoneNumber,
  createWarehouseCode,
} from "@/modules/warehouse/domain";

export function toWarehouseDto(warehouse: Warehouse): WarehouseDto {
  const props = warehouse.toProps();

  return {
    id: props.id,
    warehouseCode: props.warehouseCode,
    name: props.name,
    description: props.description,
    address: props.address,
    contactPerson: props.contactPerson,
    phone: props.phone,
    isActive: props.isActive,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateWarehouseData(
  input: CreateWarehouseInput,
): CreateWarehouseData {
  return {
    warehouseCode: createWarehouseCode(input.warehouseCode),
    name: input.name,
    description: input.description,
    address: input.address,
    contactPerson: input.contactPerson,
    phone: createPhoneNumber(input.phone),
    isActive: input.isActive,
  };
}

export function toUpdateWarehouseData(
  input: UpdateWarehouseInput,
): UpdateWarehouseData {
  return {
    name: input.name,
    description: input.description,
    address: input.address,
    contactPerson: input.contactPerson,
    phone:
      input.phone !== undefined ? createPhoneNumber(input.phone) : undefined,
    isActive: input.isActive,
  };
}

export function toCreateWarehouseDto(
  dto: CreateWarehouseDto,
): CreateWarehouseInput {
  return dto;
}

export function toWarehouseId(id: string): WarehouseId {
  return id as WarehouseId;
}
