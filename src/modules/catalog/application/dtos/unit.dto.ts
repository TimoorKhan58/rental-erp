export interface UnitDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUnitDto {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateUnitDto {
  code?: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UnitIdParamDto {
  id: string;
}
