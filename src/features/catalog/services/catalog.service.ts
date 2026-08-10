import type {
  AttributeResponse,
  BrandResponse,
  CatalogListParams,
  CatalogListResponse,
  CategoryResponse,
  CreateAttributePayload,
  CreateBrandPayload,
  CreateCategoryPayload,
  CreateTagPayload,
  CreateUnitPayload,
  TagResponse,
  UnitResponse,
} from "../types";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

export async function getCategories(params: CatalogListParams = {}) {
  return apiGet<CatalogListResponse<CategoryResponse>>("/categories", { params });
}

export async function createCategory(payload: CreateCategoryPayload) {
  return apiPost<CategoryResponse>("/categories", payload);
}

export async function updateCategory(
  id: string,
  payload: Partial<CreateCategoryPayload>,
) {
  return apiPatch<CategoryResponse>(`/categories/${id}`, payload);
}

export async function deleteCategory(id: string) {
  return apiDelete(`/categories/${id}`);
}

export async function getBrands(params: CatalogListParams = {}) {
  return apiGet<CatalogListResponse<BrandResponse>>("/brands", { params });
}

export async function createBrand(payload: CreateBrandPayload) {
  return apiPost<BrandResponse>("/brands", payload);
}

export async function updateBrand(id: string, payload: Partial<CreateBrandPayload>) {
  return apiPatch<BrandResponse>(`/brands/${id}`, payload);
}

export async function deleteBrand(id: string) {
  return apiDelete(`/brands/${id}`);
}

export async function getUnits(params: CatalogListParams = {}) {
  return apiGet<CatalogListResponse<UnitResponse>>("/units", { params });
}

export async function createUnit(payload: CreateUnitPayload) {
  return apiPost<UnitResponse>("/units", payload);
}

export async function updateUnit(id: string, payload: Partial<CreateUnitPayload>) {
  return apiPatch<UnitResponse>(`/units/${id}`, payload);
}

export async function deleteUnit(id: string) {
  return apiDelete(`/units/${id}`);
}

export async function getAttributes(params: CatalogListParams = {}) {
  return apiGet<CatalogListResponse<AttributeResponse>>("/product-attributes", {
    params,
  });
}

export async function createAttribute(payload: CreateAttributePayload) {
  return apiPost<AttributeResponse>("/product-attributes", payload);
}

export async function updateAttribute(
  id: string,
  payload: Partial<CreateAttributePayload>,
) {
  return apiPatch<AttributeResponse>(`/product-attributes/${id}`, payload);
}

export async function deleteAttribute(id: string) {
  return apiDelete(`/product-attributes/${id}`);
}

export async function getTags(params: CatalogListParams = {}) {
  return apiGet<CatalogListResponse<TagResponse>>("/product-tags", { params });
}

export async function createTag(payload: CreateTagPayload) {
  return apiPost<TagResponse>("/product-tags", payload);
}

export async function updateTag(id: string, payload: Partial<CreateTagPayload>) {
  return apiPatch<TagResponse>(`/product-tags/${id}`, payload);
}

export async function deleteTag(id: string) {
  return apiDelete(`/product-tags/${id}`);
}
