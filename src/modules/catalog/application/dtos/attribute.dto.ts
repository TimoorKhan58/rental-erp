import type { AttributeDataType } from "@/modules/catalog/domain";

export interface AttributeDto {
  id: string;
  name: string;
  dataType: AttributeDataType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttributeDto {
  name: string;
  dataType?: AttributeDataType;
  isActive?: boolean;
}

export interface UpdateAttributeDto {
  name?: string;
  dataType?: AttributeDataType;
  isActive?: boolean;
}

export interface AttributeIdParamDto {
  id: string;
}
