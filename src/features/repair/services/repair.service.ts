import type {
  CreateRepairPayload,
  ListRepairsParams,
  RepairListResponse,
  RepairResponse,
  UpdateRepairPayload,
} from "../types";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/repairs";

export async function getRepairs(
  params: ListRepairsParams = {},
): Promise<RepairListResponse> {
  return apiGet<RepairListResponse>(BASE, { params });
}

export async function getRepair(id: string): Promise<RepairResponse> {
  return apiGet<RepairResponse>(`${BASE}/${id}`);
}

export async function createRepair(payload: CreateRepairPayload): Promise<RepairResponse> {
  return apiPost<RepairResponse>(BASE, payload);
}

export async function updateRepair(
  id: string,
  payload: UpdateRepairPayload,
): Promise<RepairResponse> {
  return apiPatch<RepairResponse>(`${BASE}/${id}`, payload);
}

export async function startRepair(id: string): Promise<RepairResponse> {
  return apiPost<RepairResponse>(`${BASE}/${id}/start`);
}

export async function completeRepair(id: string): Promise<RepairResponse> {
  return apiPost<RepairResponse>(`${BASE}/${id}/complete`);
}

export async function cancelRepair(id: string): Promise<RepairResponse> {
  return apiPost<RepairResponse>(`${BASE}/${id}/cancel`);
}
