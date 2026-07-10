import type { Prisma } from "@/generated/prisma/client";
import { Brand } from "@/modules/catalog/domain/brand.entity";
import type {
  CreateBrandData,
  UpdateBrandData,
} from "@/modules/catalog/domain/brand.types";
import type { BrandId } from "@/shared/domain/ids";

export function toBrandDomain(record: {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Brand {
  return Brand.reconstitute({
    id: record.id as BrandId,
    name: record.name,
    description: record.description,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toBrandCreateInput(
  data: CreateBrandData,
): Prisma.BrandCreateInput {
  const normalized = Brand.create(data);

  return {
    name: normalized.name,
    description: normalized.description,
    isActive: normalized.isActive,
  };
}

export function toBrandUpdateInput(
  data: UpdateBrandData,
): Prisma.BrandUpdateInput {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };
}
