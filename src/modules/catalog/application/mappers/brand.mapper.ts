import type { Brand } from "@/modules/catalog/domain/brand.entity";
import type { BrandListQuery } from "@/modules/catalog/domain/brand-list.query";
import type {
  CreateBrandData,
  UpdateBrandData,
} from "@/modules/catalog/domain/brand.types";
import type { BrandId } from "@/shared/domain/ids";

import type { BrandDto } from "../dtos/brand.dto";
import type {
  CreateBrandInput,
  UpdateBrandInput,
} from "../schemas/brand.schemas";
import type { ListBrandsInput } from "../schemas/list-brands.schema";

export function toBrandId(id: string): BrandId {
  return id as BrandId;
}

export function toBrandDto(
  entity: Brand,
): BrandDto {
  const props = entity.toProps();

  return {
    id: props.id,
    name: props.name,
    description: props.description,
    isActive: props.isActive,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateBrandData(
  input: CreateBrandInput,
): CreateBrandData {
  return {
    name: input.name,
    description: input.description,
    isActive: input.isActive,
  };
}

export function toUpdateBrandData(
  input: UpdateBrandInput,
): UpdateBrandData {
  return {
    name: input.name,
    description: input.description,
    isActive: input.isActive,
  };
}

export function toBrandListQuery(
  input: ListBrandsInput,
): BrandListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    isActive: input.isActive,
  };
}
