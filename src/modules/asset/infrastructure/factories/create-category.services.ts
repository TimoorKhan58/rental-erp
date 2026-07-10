import type { CategoryApplicationServices as CategoryApplicationServicesBase } from "@/modules/asset/application/services/category-application-services.interface";
import {
  CategoryService,
} from "@/modules/asset/application/services/category.service";
import type { ICategoryService } from "@/modules/asset/application/services/category-application-services.interface";
import { CreateCategoryService } from "@/modules/asset/application/services/create-category.service";
import { DeleteCategoryService } from "@/modules/asset/application/services/delete-category.service";
import { GetCategoryByIdService } from "@/modules/asset/application/services/get-category-by-id.service";
import { ListCategoriesService } from "@/modules/asset/application/services/list-categories.service";
import { UpdateCategoryService } from "@/modules/asset/application/services/update-category.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createAssetCategoryRepositoryFromSharedDeps } from "./create-asset-category.repository";
import { createCategoryTransactionRunner } from "./create-category-transaction.runner";

export type { CategoryApplicationServicesBase as CategoryApplicationServices };

export interface WiredCategoryApplicationServices
  extends CategoryApplicationServicesBase {
  categoryService: ICategoryService;
}

export function createCategoryApplicationServices(
  deps: SharedDeps,
): WiredCategoryApplicationServices {
  const repository = createAssetCategoryRepositoryFromSharedDeps(deps);
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
