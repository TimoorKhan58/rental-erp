import type {
  CreateCustomerPayload,
  CustomerListResponse,
  CustomerResponse,
  ListCustomersParams,
  UpdateCustomerPayload,
  UserPermissions,
} from "../types";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/customers";

export async function getCustomers(
  params: ListCustomersParams = {},
): Promise<CustomerListResponse> {
  return apiGet<CustomerListResponse>(BASE, { params });
}

export async function getCustomer(id: string): Promise<CustomerResponse> {
  return apiGet<CustomerResponse>(`${BASE}/${id}`);
}

export async function createCustomer(
  payload: CreateCustomerPayload,
): Promise<CustomerResponse> {
  return apiPost<CustomerResponse>(BASE, payload);
}

export async function updateCustomer(
  id: string,
  payload: UpdateCustomerPayload,
): Promise<CustomerResponse> {
  return apiPatch<CustomerResponse>(`${BASE}/${id}`, payload);
}

export async function deleteCustomer(id: string): Promise<null> {
  return apiDelete<null>(`${BASE}/${id}`);
}

export async function getCurrentUserPermissions(): Promise<UserPermissions> {
  const profile = await apiGet<{
    role: string;
    permissions: string[];
  }>("/users/me");

  return {
    role: profile.role,
    permissions: profile.permissions,
  };
}
