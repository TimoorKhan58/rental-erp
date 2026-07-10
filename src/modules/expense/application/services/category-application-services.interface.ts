import type { PaginatedResult } from "@/shared/domain/pagination";

import type { ExpenseCategoryDto } from "../dtos/expense-category.dto";
import type {
  CreateExpenseCategoryInput,
  ExpenseCategoryIdParamInput,
  UpdateExpenseCategoryInput,
} from "../schemas/expense-category.schemas";
import type { ListExpenseCategoriesInput } from "../schemas/list-expense-categories.schema";
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

export type CategoryServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => CategoryApplicationServices;

export interface ICategoryService {
  getById(params: ExpenseCategoryIdParamInput): Promise<ExpenseCategoryDto>;
  list(
    input: ListExpenseCategoriesInput,
  ): Promise<PaginatedResult<ExpenseCategoryDto>>;
  create(input: CreateExpenseCategoryInput): Promise<ExpenseCategoryDto>;
  update(
    params: ExpenseCategoryIdParamInput,
    input: UpdateExpenseCategoryInput,
  ): Promise<ExpenseCategoryDto>;
  delete(params: ExpenseCategoryIdParamInput): Promise<void>;
}
