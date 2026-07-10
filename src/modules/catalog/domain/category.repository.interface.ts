import type { CategoryId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Category } from "./category.entity";
import type { CategoryListQuery } from "./category-list.query";
import type { CreateCategoryData, UpdateCategoryData } from "./category.types";

export interface ICategoryRepository {
  findById(id: CategoryId): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  findPaged(query: CategoryListQuery): Promise<PaginatedResult<Category>>;
  exists(id: CategoryId): Promise<boolean>;
  create(data: CreateCategoryData): Promise<Category>;
  update(id: CategoryId, data: UpdateCategoryData): Promise<Category>;
  delete(id: CategoryId): Promise<void>;
}
