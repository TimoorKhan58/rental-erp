import type { CustomerDto } from "@/modules/customer/application/dtos/customer.dto";

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
