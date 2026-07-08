import type { CustomerDto } from "@/modules/customer/application/dtos/customer.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface CustomerResponse {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  cnic: string | null;
  address: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponse {
  items: CustomerResponse[];
  meta: PaginationMeta;
}

export function toCustomerResponse(dto: CustomerDto): CustomerResponse {
  return {
    id: dto.id,
    customerCode: dto.customerCode,
    name: dto.name,
    phone: dto.phone,
    cnic: dto.cnic,
    address: dto.address,
    notes: dto.notes,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toCustomerListResponse(
  result: PaginatedResult<CustomerDto>,
): CustomerListResponse {
  return {
    items: result.items.map(toCustomerResponse),
    meta: result.meta,
  };
}
