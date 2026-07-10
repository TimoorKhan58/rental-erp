import type { Prisma } from "@/generated/prisma/client";
import { Tag } from "@/modules/catalog/domain/tag.entity";
import type {
  CreateTagData,
  UpdateTagData,
} from "@/modules/catalog/domain/tag.types";
import type { ProductTagId } from "@/shared/domain/ids";

export function toTagDomain(record: {
  id: string;
  name: string;
  color: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Tag {
  return Tag.reconstitute({
    id: record.id as ProductTagId,
    name: record.name,
    color: record.color,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toTagCreateInput(
  data: CreateTagData,
): Prisma.ProductTagCreateInput {
  const normalized = Tag.create(data);

  return {
    name: normalized.name,
    color: normalized.color,
    isActive: normalized.isActive,
  };
}

export function toTagUpdateInput(
  data: UpdateTagData,
): Prisma.ProductTagUpdateInput {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.color !== undefined ? { color: data.color } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };
}
