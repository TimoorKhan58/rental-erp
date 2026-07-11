import type {
  CreateProcurementPayload,
  ListProcurementsParams,
  ProcurementListResponse,
  ProcurementResponse,
  ReceiveProcurementPayload,
  UpdateProcurementPayload,
} from "../types";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/purchase-orders";

export async function getProcurements(
  params: ListProcurementsParams = {},
): Promise<ProcurementListResponse> {
  return apiGet<ProcurementListResponse>(BASE, { params });
}

export async function getProcurement(id: string): Promise<ProcurementResponse> {
  return apiGet<ProcurementResponse>(`${BASE}/${id}`);
}

export async function createProcurement(
  payload: CreateProcurementPayload,
): Promise<ProcurementResponse> {
  return apiPost<ProcurementResponse>(BASE, payload);
}

export async function updateProcurement(
  id: string,
  payload: UpdateProcurementPayload,
): Promise<ProcurementResponse> {
  return apiPatch<ProcurementResponse>(`${BASE}/${id}`, payload);
}

export async function approveProcurement(id: string): Promise<ProcurementResponse> {
  return apiPost<ProcurementResponse>(`${BASE}/${id}/approve`);
}

export async function receiveProcurement(
  id: string,
  payload: ReceiveProcurementPayload,
): Promise<ProcurementResponse> {
  return apiPost<ProcurementResponse>(`${BASE}/${id}/receive`, payload);
}

export async function cancelProcurement(id: string): Promise<ProcurementResponse> {
  return apiPost<ProcurementResponse>(`${BASE}/${id}/cancel`);
}
