import type {
  CreateDispatchPayload,
  DispatchListResponse,
  DispatchResponse,
  ListDispatchesParams,
  UpdateDispatchPayload,
} from "../types";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/dispatches";

export async function getDispatches(
  params: ListDispatchesParams = {},
): Promise<DispatchListResponse> {
  return apiGet<DispatchListResponse>(BASE, { params });
}

export async function getDispatch(id: string): Promise<DispatchResponse> {
  return apiGet<DispatchResponse>(`${BASE}/${id}`);
}

export async function createDispatch(
  payload: CreateDispatchPayload,
): Promise<DispatchResponse> {
  return apiPost<DispatchResponse>(BASE, payload);
}

export async function updateDispatch(
  id: string,
  payload: UpdateDispatchPayload,
): Promise<DispatchResponse> {
  return apiPatch<DispatchResponse>(`${BASE}/${id}`, payload);
}

export async function completeDispatch(id: string): Promise<DispatchResponse> {
  return apiPost<DispatchResponse>(`${BASE}/${id}/complete`);
}

export async function cancelDispatch(id: string): Promise<DispatchResponse> {
  return apiPost<DispatchResponse>(`${BASE}/${id}/cancel`);
}
