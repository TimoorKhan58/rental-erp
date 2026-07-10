import type { PaginatedResult } from "@/shared/domain/pagination";

import type { AssetCategoryDto } from "../dtos/asset-category.dto";
import type {
  AssetCategoryIdParamInput,
  CreateAssetCategoryInput,
  UpdateAssetCategoryInput,
} from "../schemas/asset-category.schemas";
import type { ListAssetCategoriesInput } from "../schemas/list-asset-categories.schema";
import type { CreateCategoryService } from "./create-category.service";
import type { DeleteCategoryService } from "./delete-category.service";
import type { GetCategoryByIdService } from "./get-category-by-id.service";
import type { ListCategoriesService } from "./list-categories.service";
import type { UpdateCategoryService } from "./update-category.service";

export interface CategoryApplicationServices {
  getCategoryById: GetCategoryByIdService;
  listCategories: ListCategoriesService;
  createCategory: CreateCategoryService;
  updateCategory: UpdateCategoryService;
  deleteCategory: DeleteCategoryService;
}

export interface ICategoryService {
  getById(params: AssetCategoryIdParamInput): Promise<AssetCategoryDto>;
  list(
    input: ListAssetCategoriesInput,
  ): Promise<PaginatedResult<AssetCategoryDto>>;
  create(input: CreateAssetCategoryInput): Promise<AssetCategoryDto>;
  update(
    params: AssetCategoryIdParamInput,
    input: UpdateAssetCategoryInput,
  ): Promise<AssetCategoryDto>;
  delete(params: AssetCategoryIdParamInput): Promise<void>;
}

export type CategoryServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => CategoryApplicationServices;
