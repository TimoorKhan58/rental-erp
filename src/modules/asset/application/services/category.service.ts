import type { PaginatedResult } from "@/shared/domain/pagination";

import type { AssetCategoryDto } from "../dtos/asset-category.dto";
import type {
  AssetCategoryIdParamInput,
  CreateAssetCategoryInput,
  UpdateAssetCategoryInput,
} from "../schemas/asset-category.schemas";
import type { ListAssetCategoriesInput } from "../schemas/list-asset-categories.schema";
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

  getById(params: AssetCategoryIdParamInput): Promise<AssetCategoryDto> {
    return this.getCategoryById.execute(params);
  }

  list(
    input: ListAssetCategoriesInput,
  ): Promise<PaginatedResult<AssetCategoryDto>> {
    return this.listCategories.execute(input);
  }

  create(input: CreateAssetCategoryInput): Promise<AssetCategoryDto> {
    return this.createCategory.execute(input);
  }

  update(
    params: AssetCategoryIdParamInput,
    input: UpdateAssetCategoryInput,
  ): Promise<AssetCategoryDto> {
    return this.updateCategory.execute(params, input);
  }

  delete(params: AssetCategoryIdParamInput): Promise<void> {
    return this.deleteCategory.execute(params);
  }
}
