export interface WarehouseDto {
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

export interface CreateWarehouseDto {
  warehouseCode: string;
  name: string;
  description?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

export interface UpdateWarehouseDto {
  name?: string;
  description?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

export interface WarehouseIdParamDto {
  id: string;
}
