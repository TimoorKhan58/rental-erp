import type { PaginatedResult } from "@/shared/domain/pagination";

import type { CategoryDto } from "../dtos/category.dto";
import type {
  CreateCategoryInput,
  CategoryIdParamInput,
  UpdateCategoryInput,
} from "../schemas/category.schemas";
import type { ListCategoriesInput } from "../schemas/list-categories.schema";
import type { ICategoryService } from "./category-application-services.interface";
import type { CreateCategoryService } from "./create-category.service";
import type { DeleteCategoryService } from "./delete-category.service";
import type { GetCategoryByIdService } from "./get-category-by-id.service";
import type { ListCategoriesService } from "./list-categories.service";
import type { UpdateCategoryService } from "./update-category.service";

export class CategoryService implements ICategoryService {
  constructor(
    private readonly getByIdService: GetCategoryByIdService,
    private readonly listService: ListCategoriesService,
    private readonly createService: CreateCategoryService,
    private readonly updateService: UpdateCategoryService,
    private readonly deleteService: DeleteCategoryService,
  ) {}

  getById(params: CategoryIdParamInput): Promise<CategoryDto> {
    return this.getByIdService.execute(params);
  }

  list(input: ListCategoriesInput): Promise<PaginatedResult<CategoryDto>> {
    return this.listService.execute(input);
  }

  create(input: CreateCategoryInput): Promise<CategoryDto> {
    return this.createService.execute(input);
  }

  update(
    params: CategoryIdParamInput,
    input: UpdateCategoryInput,
  ): Promise<CategoryDto> {
    return this.updateService.execute(params, input);
  }

  delete(params: CategoryIdParamInput): Promise<void> {
    return this.deleteService.execute(params);
  }
}
