import type { PaginatedResult } from "@/shared/domain/pagination";

import type { CategoryDto } from "../dtos/category.dto";
import type {
  CreateCategoryInput,
  CategoryIdParamInput,
  UpdateCategoryInput,
} from "../schemas/category.schemas";
import type { ListCategoriesInput } from "../schemas/list-categories.schema";
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
  getById(params: CategoryIdParamInput): Promise<CategoryDto>;
  list(input: ListCategoriesInput): Promise<PaginatedResult<CategoryDto>>;
  create(input: CreateCategoryInput): Promise<CategoryDto>;
  update(
    params: CategoryIdParamInput,
    input: UpdateCategoryInput,
  ): Promise<CategoryDto>;
  delete(params: CategoryIdParamInput): Promise<void>;
}
