import type { Tag } from "@/modules/catalog/domain/tag.entity";
import type { TagListQuery } from "@/modules/catalog/domain/tag-list.query";
import type {
  CreateTagData,
  UpdateTagData,
} from "@/modules/catalog/domain/tag.types";
import type { ProductTagId } from "@/shared/domain/ids";

import type { TagDto } from "../dtos/tag.dto";
import type {
  CreateTagInput,
  UpdateTagInput,
} from "../schemas/tag.schemas";
import type { ListTagsInput } from "../schemas/list-tags.schema";

export function toTagId(id: string): ProductTagId {
  return id as ProductTagId;
}

export function toTagDto(
  entity: Tag,
): TagDto {
  const props = entity.toProps();

  return {
    id: props.id,
    name: props.name,
    color: props.color,
    isActive: props.isActive,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateTagData(
  input: CreateTagInput,
): CreateTagData {
  return {
    name: input.name,
    color: input.color,
    isActive: input.isActive,
  };
}

export function toUpdateTagData(
  input: UpdateTagInput,
): UpdateTagData {
  return {
    name: input.name,
    color: input.color,
    isActive: input.isActive,
  };
}

export function toTagListQuery(
  input: ListTagsInput,
): TagListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    isActive: input.isActive,
  };
}
