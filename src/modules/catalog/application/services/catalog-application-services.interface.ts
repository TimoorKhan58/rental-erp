import type { ExecutionContext } from "@/shared/application/context";

import type { CreateCategoryService } from "./create-category.service";
import type { DeleteCategoryService } from "./delete-category.service";
import type { GetCategoryByIdService } from "./get-category-by-id.service";
import type { ListCategoriesService } from "./list-categories.service";
import type { UpdateCategoryService } from "./update-category.service";
import type { ICategoryService } from "./category-application-services.interface";
import type { CreateBrandService } from "./create-brand.service";
import type { DeleteBrandService } from "./delete-brand.service";
import type { GetBrandByIdService } from "./get-brand-by-id.service";
import type { ListBrandsService } from "./list-brands.service";
import type { UpdateBrandService } from "./update-brand.service";
import type { IBrandService } from "./brand-application-services.interface";
import type { CreateUnitService } from "./create-unit.service";
import type { DeleteUnitService } from "./delete-unit.service";
import type { GetUnitByIdService } from "./get-unit-by-id.service";
import type { ListUnitsService } from "./list-units.service";
import type { UpdateUnitService } from "./update-unit.service";
import type { IUnitService } from "./unit-application-services.interface";
import type { CreateAttributeService } from "./create-attribute.service";
import type { DeleteAttributeService } from "./delete-attribute.service";
import type { GetAttributeByIdService } from "./get-attribute-by-id.service";
import type { ListAttributesService } from "./list-attributes.service";
import type { UpdateAttributeService } from "./update-attribute.service";
import type { IAttributeService } from "./attribute-application-services.interface";
import type { CreateTagService } from "./create-tag.service";
import type { DeleteTagService } from "./delete-tag.service";
import type { GetTagByIdService } from "./get-tag-by-id.service";
import type { ListTagsService } from "./list-tags.service";
import type { UpdateTagService } from "./update-tag.service";
import type { ITagService } from "./tag-application-services.interface";

export interface CatalogApplicationServices {
  getCategoryById: GetCategoryByIdService;
  listCategories: ListCategoriesService;
  createCategory: CreateCategoryService;
  updateCategory: UpdateCategoryService;
  deleteCategory: DeleteCategoryService;
  getBrandById: GetBrandByIdService;
  listBrands: ListBrandsService;
  createBrand: CreateBrandService;
  updateBrand: UpdateBrandService;
  deleteBrand: DeleteBrandService;
  getUnitById: GetUnitByIdService;
  listUnits: ListUnitsService;
  createUnit: CreateUnitService;
  updateUnit: UpdateUnitService;
  deleteUnit: DeleteUnitService;
  getAttributeById: GetAttributeByIdService;
  listAttributes: ListAttributesService;
  createAttribute: CreateAttributeService;
  updateAttribute: UpdateAttributeService;
  deleteAttribute: DeleteAttributeService;
  getTagById: GetTagByIdService;
  listTags: ListTagsService;
  createTag: CreateTagService;
  updateTag: UpdateTagService;
  deleteTag: DeleteTagService;
  categoryService: ICategoryService;
  brandService: IBrandService;
  unitService: IUnitService;
  attributeService: IAttributeService;
  tagService: ITagService;
}

export type CatalogServiceResolver = (
  ctx: ExecutionContext,
) => CatalogApplicationServices;

export interface ICatalogService {
  readonly categories: ICategoryService;
  readonly brands: IBrandService;
  readonly units: IUnitService;
  readonly attributes: IAttributeService;
  readonly tags: ITagService;
}
