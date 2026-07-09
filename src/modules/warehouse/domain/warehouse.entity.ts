import type { WarehouseId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import { WarehouseInvariantError } from "./warehouse.errors";
import type { CreateWarehouseData } from "./warehouse.types";
import type { PhoneNumber } from "./value-objects/phone.vo";
import type { WarehouseCode } from "./value-objects/warehouse-code.vo";
import { createPhoneNumber } from "./value-objects/phone.vo";
import { createWarehouseCode } from "./value-objects/warehouse-code.vo";

export interface WarehouseProps {
  id: WarehouseId;
  warehouseCode: WarehouseCode;
  name: string;
  description: string | null;
  address: string | null;
  contactPerson: string | null;
  phone: PhoneNumber | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Warehouse implements Entity<WarehouseId> {
  readonly id: WarehouseId;
  readonly warehouseCode: WarehouseCode;
  readonly name: string;
  readonly description: string | null;
  readonly address: string | null;
  readonly contactPerson: string | null;
  readonly phone: PhoneNumber | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: WarehouseProps) {
    this.id = props.id;
    this.warehouseCode = props.warehouseCode;
    this.name = props.name;
    this.description = props.description;
    this.address = props.address;
    this.contactPerson = props.contactPerson;
    this.phone = props.phone;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    data: CreateWarehouseData,
  ): Omit<WarehouseProps, "id" | "createdAt" | "updatedAt"> {
    return {
      warehouseCode: data.warehouseCode,
      name: normalizeRequiredText(data.name, "name"),
      description: normalizeOptionalText(data.description),
      address: normalizeOptionalText(data.address),
      contactPerson: normalizeOptionalText(data.contactPerson),
      phone: data.phone ?? null,
      isActive: data.isActive ?? true,
    };
  }

  static reconstitute(props: WarehouseProps): Warehouse {
    return new Warehouse({
      id: props.id,
      warehouseCode: createWarehouseCode(props.warehouseCode),
      name: normalizeRequiredText(props.name, "name"),
      description: normalizeOptionalText(props.description),
      address: normalizeOptionalText(props.address),
      contactPerson: normalizeOptionalText(props.contactPerson),
      phone: createPhoneNumber(props.phone),
      isActive: props.isActive,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  toProps(): WarehouseProps {
    return {
      id: this.id,
      warehouseCode: this.warehouseCode,
      name: this.name,
      description: this.description,
      address: this.address,
      contactPerson: this.contactPerson,
      phone: this.phone,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

function normalizeRequiredText(value: string, field: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new WarehouseInvariantError(`${field} is required`, field);
  }

  return trimmed;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
