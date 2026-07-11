import type {
  CreateSupplierPayload,
  SupplierListResponse,
  SupplierResponse,
  ListSuppliersParams,
  UpdateSupplierPayload,
} from "../types";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/suppliers";

export async function getSuppliers(
  params: ListSuppliersParams = {},
): Promise<SupplierListResponse> {
  return apiGet<SupplierListResponse>(BASE, { params });
}

export async function getSupplier(id: string): Promise<SupplierResponse> {
  return apiGet<SupplierResponse>(`${BASE}/${id}`);
}

export async function createSupplier(
  payload: CreateSupplierPayload,
): Promise<SupplierResponse> {
  return apiPost<SupplierResponse>(BASE, payload);
}

export async function updateSupplier(
  id: string,
  payload: UpdateSupplierPayload,
): Promise<SupplierResponse> {
  return apiPatch<SupplierResponse>(`${BASE}/${id}`, payload);
}

export async function deleteSupplier(id: string): Promise<null> {
  return apiDelete<null>(`${BASE}/${id}`);
}
