import type { PaginatedResult } from "@/shared/domain/pagination";

import type { ExpenseCategoryDto } from "../dtos/expense-category.dto";
import type {
  CreateExpenseCategoryInput,
  ExpenseCategoryIdParamInput,
  UpdateExpenseCategoryInput,
} from "../schemas/expense-category.schemas";
import type { ListExpenseCategoriesInput } from "../schemas/list-expense-categories.schema";
import type { ICategoryService } from "./category-application-services.interface";
import type { CreateCategoryService } from "./create-category.service";
import type { DeleteCategoryService } from "./delete-category.service";
import type { GetCategoryByIdService } from "./get-category-by-id.service";
import type { ListCategoriesService } from "./list-categories.service";
import type { UpdateCategoryService } from "./update-category.service";

export class CategoryService implements ICategoryService {
  constructor(
    private readonly getCategoryById: GetCategoryByIdService,
    private readonly listCategories: ListCategoriesService,
    private readonly createCategory: CreateCategoryService,
    private readonly updateCategory: UpdateCategoryService,
    private readonly deleteCategory: DeleteCategoryService,
  ) {}

  getById(params: ExpenseCategoryIdParamInput): Promise<ExpenseCategoryDto> {
    return this.getCategoryById.execute(params);
  }

  list(
    input: ListExpenseCategoriesInput,
  ): Promise<PaginatedResult<ExpenseCategoryDto>> {
    return this.listCategories.execute(input);
  }

  create(input: CreateExpenseCategoryInput): Promise<ExpenseCategoryDto> {
    return this.createCategory.execute(input);
  }

  update(
    params: ExpenseCategoryIdParamInput,
    input: UpdateExpenseCategoryInput,
  ): Promise<ExpenseCategoryDto> {
    return this.updateCategory.execute(params, input);
  }

  delete(params: ExpenseCategoryIdParamInput): Promise<void> {
    return this.deleteCategory.execute(params);
  }
}
