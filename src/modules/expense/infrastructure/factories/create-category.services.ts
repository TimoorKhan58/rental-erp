import type { CategoryApplicationServices as CategoryApplicationServicesBase } from "@/modules/expense/application/services/category-application-services.interface";
import {
  CategoryService,
} from "@/modules/expense/application/services/category.service";
import type { ICategoryService } from "@/modules/expense/application/services/category-application-services.interface";
import { CreateCategoryService } from "@/modules/expense/application/services/create-category.service";
import { DeleteCategoryService } from "@/modules/expense/application/services/delete-category.service";
import { GetCategoryByIdService } from "@/modules/expense/application/services/get-category-by-id.service";
import { ListCategoriesService } from "@/modules/expense/application/services/list-categories.service";
import { UpdateCategoryService } from "@/modules/expense/application/services/update-category.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createExpenseCategoryRepositoryFromSharedDeps } from "./create-expense-category.repository";
import { createCategoryTransactionRunner } from "./create-category-transaction.runner";

export type { CategoryApplicationServicesBase as CategoryApplicationServices };

export interface WiredCategoryApplicationServices
  extends CategoryApplicationServicesBase {
  categoryService: ICategoryService;
}

export function createCategoryApplicationServices(
  deps: SharedDeps,
): WiredCategoryApplicationServices {
  const repository = createExpenseCategoryRepositoryFromSharedDeps(deps);
  const transactionRunner = createCategoryTransactionRunner(deps);

  const getCategoryById = new GetCategoryByIdService(repository);
  const listCategories = new ListCategoriesService(repository);
  const createCategory = new CreateCategoryService(transactionRunner);
  const updateCategory = new UpdateCategoryService(transactionRunner);
  const deleteCategory = new DeleteCategoryService(transactionRunner);

  return {
    getCategoryById,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    categoryService: new CategoryService(
      getCategoryById,
      listCategories,
      createCategory,
      updateCategory,
      deleteCategory,
    ),
  };
}
