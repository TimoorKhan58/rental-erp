import type { CatalogApplicationServices as CatalogApplicationServicesBase } from "@/modules/catalog/application/services/catalog-application-services.interface";
import {
  CatalogService,
  type ICatalogService,
} from "@/modules/catalog/application/services/catalog.service";
import { CreateCategoryService } from "@/modules/catalog/application/services/create-category.service";
import { DeleteCategoryService } from "@/modules/catalog/application/services/delete-category.service";
import { GetCategoryByIdService } from "@/modules/catalog/application/services/get-category-by-id.service";
import { ListCategoriesService } from "@/modules/catalog/application/services/list-categories.service";
import { UpdateCategoryService } from "@/modules/catalog/application/services/update-category.service";
import { CategoryService } from "@/modules/catalog/application/services/category.service";
import { createCategoryRepositoryFromSharedDeps } from "./create-category.repository";
import { createCategoryTransactionRunner } from "./create-category-transaction.runner";
import { CreateBrandService } from "@/modules/catalog/application/services/create-brand.service";
import { DeleteBrandService } from "@/modules/catalog/application/services/delete-brand.service";
import { GetBrandByIdService } from "@/modules/catalog/application/services/get-brand-by-id.service";
import { ListBrandsService } from "@/modules/catalog/application/services/list-brands.service";
import { UpdateBrandService } from "@/modules/catalog/application/services/update-brand.service";
import { BrandService } from "@/modules/catalog/application/services/brand.service";
import { createBrandRepositoryFromSharedDeps } from "./create-brand.repository";
import { createBrandTransactionRunner } from "./create-brand-transaction.runner";
import { CreateUnitService } from "@/modules/catalog/application/services/create-unit.service";
import { DeleteUnitService } from "@/modules/catalog/application/services/delete-unit.service";
import { GetUnitByIdService } from "@/modules/catalog/application/services/get-unit-by-id.service";
import { ListUnitsService } from "@/modules/catalog/application/services/list-units.service";
import { UpdateUnitService } from "@/modules/catalog/application/services/update-unit.service";
import { UnitService } from "@/modules/catalog/application/services/unit.service";
import { createUnitRepositoryFromSharedDeps } from "./create-unit.repository";
import { createUnitTransactionRunner } from "./create-unit-transaction.runner";
import { CreateAttributeService } from "@/modules/catalog/application/services/create-attribute.service";
import { DeleteAttributeService } from "@/modules/catalog/application/services/delete-attribute.service";
import { GetAttributeByIdService } from "@/modules/catalog/application/services/get-attribute-by-id.service";
import { ListAttributesService } from "@/modules/catalog/application/services/list-attributes.service";
import { UpdateAttributeService } from "@/modules/catalog/application/services/update-attribute.service";
import { AttributeService } from "@/modules/catalog/application/services/attribute.service";
import { createAttributeRepositoryFromSharedDeps } from "./create-attribute.repository";
import { createAttributeTransactionRunner } from "./create-attribute-transaction.runner";
import { CreateTagService } from "@/modules/catalog/application/services/create-tag.service";
import { DeleteTagService } from "@/modules/catalog/application/services/delete-tag.service";
import { GetTagByIdService } from "@/modules/catalog/application/services/get-tag-by-id.service";
import { ListTagsService } from "@/modules/catalog/application/services/list-tags.service";
import { UpdateTagService } from "@/modules/catalog/application/services/update-tag.service";
import { TagService } from "@/modules/catalog/application/services/tag.service";
import { createTagRepositoryFromSharedDeps } from "./create-tag.repository";
import { createTagTransactionRunner } from "./create-tag-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

export type { CatalogApplicationServicesBase as CatalogApplicationServices };

export interface WiredCatalogApplicationServices
  extends CatalogApplicationServicesBase {
  catalogService: ICatalogService;
}

export function createCatalogApplicationServices(
  deps: SharedDeps,
): WiredCatalogApplicationServices {
  const categoryRepository = createCategoryRepositoryFromSharedDeps(deps);
  const categoryTransactionRunner = createCategoryTransactionRunner(deps);

  const getCategoryById = new GetCategoryByIdService(categoryRepository);
  const listCategories = new ListCategoriesService(categoryRepository);
  const createCategory = new CreateCategoryService(categoryTransactionRunner);
  const updateCategory = new UpdateCategoryService(categoryTransactionRunner);
  const deleteCategory = new DeleteCategoryService(categoryTransactionRunner);
  const categoryService = new CategoryService(
    getCategoryById,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  );

  const brandRepository = createBrandRepositoryFromSharedDeps(deps);
  const brandTransactionRunner = createBrandTransactionRunner(deps);

  const getBrandById = new GetBrandByIdService(brandRepository);
  const listBrands = new ListBrandsService(brandRepository);
  const createBrand = new CreateBrandService(brandTransactionRunner);
  const updateBrand = new UpdateBrandService(brandTransactionRunner);
  const deleteBrand = new DeleteBrandService(brandTransactionRunner);
  const brandService = new BrandService(
    getBrandById,
    listBrands,
    createBrand,
    updateBrand,
    deleteBrand,
  );

  const unitRepository = createUnitRepositoryFromSharedDeps(deps);
  const unitTransactionRunner = createUnitTransactionRunner(deps);

  const getUnitById = new GetUnitByIdService(unitRepository);
  const listUnits = new ListUnitsService(unitRepository);
  const createUnit = new CreateUnitService(unitTransactionRunner);
  const updateUnit = new UpdateUnitService(unitTransactionRunner);
  const deleteUnit = new DeleteUnitService(unitTransactionRunner);
  const unitService = new UnitService(
    getUnitById,
    listUnits,
    createUnit,
    updateUnit,
    deleteUnit,
  );

  const attributeRepository = createAttributeRepositoryFromSharedDeps(deps);
  const attributeTransactionRunner = createAttributeTransactionRunner(deps);

  const getAttributeById = new GetAttributeByIdService(attributeRepository);
  const listAttributes = new ListAttributesService(attributeRepository);
  const createAttribute = new CreateAttributeService(attributeTransactionRunner);
  const updateAttribute = new UpdateAttributeService(attributeTransactionRunner);
  const deleteAttribute = new DeleteAttributeService(attributeTransactionRunner);
  const attributeService = new AttributeService(
    getAttributeById,
    listAttributes,
    createAttribute,
    updateAttribute,
    deleteAttribute,
  );

  const tagRepository = createTagRepositoryFromSharedDeps(deps);
  const tagTransactionRunner = createTagTransactionRunner(deps);

  const getTagById = new GetTagByIdService(tagRepository);
  const listTags = new ListTagsService(tagRepository);
  const createTag = new CreateTagService(tagTransactionRunner);
  const updateTag = new UpdateTagService(tagTransactionRunner);
  const deleteTag = new DeleteTagService(tagTransactionRunner);
  const tagService = new TagService(
    getTagById,
    listTags,
    createTag,
    updateTag,
    deleteTag,
  );

  const catalogService = new CatalogService(
    categoryService,
    brandService,
    unitService,
    attributeService,
    tagService,
  );

  return {
    getCategoryById,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    categoryService,
    getBrandById,
    listBrands,
    createBrand,
    updateBrand,
    deleteBrand,
    brandService,
    getUnitById,
    listUnits,
    createUnit,
    updateUnit,
    deleteUnit,
    unitService,
    getAttributeById,
    listAttributes,
    createAttribute,
    updateAttribute,
    deleteAttribute,
    attributeService,
    getTagById,
    listTags,
    createTag,
    updateTag,
    deleteTag,
    tagService,
    catalogService,
  };
}
