export interface CustomerDto {
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

export interface CreateCustomerDto {
  customerCode: string;
  name: string;
  phone: string;
  cnic?: string | null;
  address: string;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  cnic?: string | null;
  address?: string;
  notes?: string | null;
  isActive?: boolean;
}

export interface CustomerIdParamDto {
  id: string;
}
