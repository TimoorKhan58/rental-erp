export interface SupplierDto {
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

export interface CreateSupplierDto {
  supplierCode: string;
  name: string;
  phone: string;
  email?: string | null;
  address: string;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpdateSupplierDto {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string;
  notes?: string | null;
  isActive?: boolean;
}

export interface SupplierIdParamDto {
  id: string;
}
