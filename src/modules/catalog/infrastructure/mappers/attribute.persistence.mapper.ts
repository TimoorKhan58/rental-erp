import type { AttributeDataType } from "@/modules/catalog/domain/attribute.constants";
import type { Prisma } from "@/generated/prisma/client";
import { Attribute } from "@/modules/catalog/domain/attribute.entity";
import type {
  CreateAttributeData,
  UpdateAttributeData,
} from "@/modules/catalog/domain/attribute.types";
import type { ProductAttributeId } from "@/shared/domain/ids";

export function toAttributeDomain(record: {
  id: string;
  name: string;
  dataType: AttributeDataType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Attribute {
  return Attribute.reconstitute({
    id: record.id as ProductAttributeId,
    name: record.name,
    dataType: record.dataType,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toAttributeCreateInput(
  data: CreateAttributeData,
): Prisma.ProductAttributeCreateInput {
  const normalized = Attribute.create(data);

  return {
    name: normalized.name,
    dataType: normalized.dataType,
    isActive: normalized.isActive,
  };
}

export function toAttributeUpdateInput(
  data: UpdateAttributeData,
): Prisma.ProductAttributeUpdateInput {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.dataType !== undefined ? { dataType: data.dataType } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };
}
