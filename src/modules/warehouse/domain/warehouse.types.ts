import type { PhoneNumber } from "./value-objects/phone.vo";
import type { WarehouseCode } from "./value-objects/warehouse-code.vo";

export interface CreateWarehouseData {
  warehouseCode: WarehouseCode;
  name: string;
  description?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  phone?: PhoneNumber | null;
  isActive?: boolean;
}

export interface UpdateWarehouseData {
  name?: string;
  description?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  phone?: PhoneNumber | null;
  isActive?: boolean;
}
