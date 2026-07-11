import type {
  CreateMaintenancePayload,
  ListMaintenancesParams,
  MaintenanceListResponse,
  MaintenanceResponse,
  UpdateMaintenancePayload,
} from "../types";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/maintenances";

export async function getMaintenances(
  params: ListMaintenancesParams = {},
): Promise<MaintenanceListResponse> {
  return apiGet<MaintenanceListResponse>(BASE, { params });
}

export async function getMaintenance(id: string): Promise<MaintenanceResponse> {
  return apiGet<MaintenanceResponse>(`${BASE}/${id}`);
}

export async function createMaintenance(
  payload: CreateMaintenancePayload,
): Promise<MaintenanceResponse> {
  return apiPost<MaintenanceResponse>(BASE, payload);
}

export async function updateMaintenance(
  id: string,
  payload: UpdateMaintenancePayload,
): Promise<MaintenanceResponse> {
  return apiPatch<MaintenanceResponse>(`${BASE}/${id}`, payload);
}

export async function startMaintenance(id: string): Promise<MaintenanceResponse> {
  return apiPost<MaintenanceResponse>(`${BASE}/${id}/start`);
}

export async function completeMaintenance(id: string): Promise<MaintenanceResponse> {
  return apiPost<MaintenanceResponse>(`${BASE}/${id}/complete`);
}

export async function cancelMaintenance(id: string): Promise<MaintenanceResponse> {
  return apiPost<MaintenanceResponse>(`${BASE}/${id}/cancel`);
}
