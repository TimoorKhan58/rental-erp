import type { SupplierDto } from "@/modules/supplier/application/dtos/supplier.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface SupplierResponse {
  id: string;
  supplierCode: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListResponse {
  items: SupplierResponse[];
  meta: PaginationMeta;
}

export function toSupplierResponse(dto: SupplierDto): SupplierResponse {
  return {
    id: dto.id,
    supplierCode: dto.supplierCode,
    name: dto.name,
    phone: dto.phone,
    email: dto.email,
    address: dto.address,
    notes: dto.notes,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toSupplierListResponse(
  result: PaginatedResult<SupplierDto>,
): SupplierListResponse {
  return {
    items: result.items.map(toSupplierResponse),
    meta: result.meta,
  };
}
