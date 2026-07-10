export interface TagDto {
  id: string;
  name: string;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagDto {
  name: string;
  color?: string | null;
  isActive?: boolean;
}

export interface UpdateTagDto {
  name?: string;
  color?: string | null;
  isActive?: boolean;
}

export interface TagIdParamDto {
  id: string;
}
