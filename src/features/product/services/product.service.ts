import type {
  CreateProductPayload,
  ProductListResponse,
  ProductResponse,
  ListProductsParams,
  UpdateProductPayload,
} from "../types";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/products";

export async function getProducts(
  params: ListProductsParams = {},
): Promise<ProductListResponse> {
  return apiGet<ProductListResponse>(BASE, { params });
}

export async function getProduct(id: string): Promise<ProductResponse> {
  return apiGet<ProductResponse>(`${BASE}/${id}`);
}

export async function createProduct(
  payload: CreateProductPayload,
): Promise<ProductResponse> {
  return apiPost<ProductResponse>(BASE, payload);
}

export async function updateProduct(
  id: string,
  payload: UpdateProductPayload,
): Promise<ProductResponse> {
  return apiPatch<ProductResponse>(`${BASE}/${id}`, payload);
}

export async function deleteProduct(id: string): Promise<null> {
  return apiDelete<null>(`${BASE}/${id}`);
}
