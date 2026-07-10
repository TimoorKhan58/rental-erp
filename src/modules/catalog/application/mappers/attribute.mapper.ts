import type { Attribute } from "@/modules/catalog/domain/attribute.entity";
import type { AttributeListQuery } from "@/modules/catalog/domain/attribute-list.query";
import type {
  CreateAttributeData,
  UpdateAttributeData,
} from "@/modules/catalog/domain/attribute.types";
import type { ProductAttributeId } from "@/shared/domain/ids";

import type { AttributeDto } from "../dtos/attribute.dto";
import type {
  CreateAttributeInput,
  UpdateAttributeInput,
} from "../schemas/attribute.schemas";
import type { ListAttributesInput } from "../schemas/list-attributes.schema";

export function toAttributeId(id: string): ProductAttributeId {
  return id as ProductAttributeId;
}

export function toAttributeDto(
  entity: Attribute,
): AttributeDto {
  const props = entity.toProps();

  return {
    id: props.id,
    name: props.name,
    dataType: props.dataType,
    isActive: props.isActive,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateAttributeData(
  input: CreateAttributeInput,
): CreateAttributeData {
  return {
    name: input.name,
    dataType: input.dataType,
    isActive: input.isActive,
  };
}

export function toUpdateAttributeData(
  input: UpdateAttributeInput,
): UpdateAttributeData {
  return {
    name: input.name,
    dataType: input.dataType,
    isActive: input.isActive,
  };
}

export function toAttributeListQuery(
  input: ListAttributesInput,
): AttributeListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    isActive: input.isActive,
    dataType: input.dataType,
  };
}
