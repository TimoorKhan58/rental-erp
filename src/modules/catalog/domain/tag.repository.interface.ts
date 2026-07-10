import type { ProductTagId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Tag } from "./tag.entity";
import type { TagListQuery } from "./tag-list.query";
import type { CreateTagData, UpdateTagData } from "./tag.types";

export interface ITagRepository {
  findById(id: ProductTagId): Promise<Tag | null>;
  findByName(name: string): Promise<Tag | null>;
  findPaged(query: TagListQuery): Promise<PaginatedResult<Tag>>;
  exists(id: ProductTagId): Promise<boolean>;
  create(data: CreateTagData): Promise<Tag>;
  update(id: ProductTagId, data: UpdateTagData): Promise<Tag>;
  delete(id: ProductTagId): Promise<void>;
}
