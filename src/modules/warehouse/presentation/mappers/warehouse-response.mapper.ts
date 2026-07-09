import type { WarehouseDto } from "@/modules/warehouse/application/dtos/warehouse.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface WarehouseResponse {
  id: string;
  warehouseCode: string;
  name: string;
  description: string | null;
  address: string | null;
  contactPerson: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseListResponse {
  items: WarehouseResponse[];
  meta: PaginationMeta;
}

export function toWarehouseResponse(dto: WarehouseDto): WarehouseResponse {
  return {
    id: dto.id,
    warehouseCode: dto.warehouseCode,
    name: dto.name,
    description: dto.description,
    address: dto.address,
    contactPerson: dto.contactPerson,
    phone: dto.phone,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toWarehouseListResponse(
  result: PaginatedResult<WarehouseDto>,
): WarehouseListResponse {
  return {
    items: result.items.map(toWarehouseResponse),
    meta: result.meta,
  };
}
