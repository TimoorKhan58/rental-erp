export interface ProductDto {
  id: string;
  productCode: string;
  name: string;
  description: string | null;
  unit: string;
  rentalRate: string;
  replacementCost: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  productCode: string;
  name: string;
  description?: string | null;
  unit: string;
  rentalRate: number;
  replacementCost?: number | null;
  isActive?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  description?: string | null;
  unit?: string;
  rentalRate?: number;
  replacementCost?: number | null;
  isActive?: boolean;
}

export interface ProductIdParamDto {
  id: string;
}
