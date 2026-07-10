export interface ExpenseCategoryDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseCategoryDto {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateExpenseCategoryDto {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface ExpenseCategoryIdParamDto {
  id: string;
}
