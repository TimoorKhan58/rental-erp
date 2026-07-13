import type {
  CreateReturnPayload,
  InspectReturnPayload,
  ListReturnsParams,
  ReturnListResponse,
  ReturnResponse,
  UpdateReturnPayload,
} from "../types";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/returns";

export async function getReturns(
  params: ListReturnsParams = {},
): Promise<ReturnListResponse> {
  return apiGet<ReturnListResponse>(BASE, { params });
}

export async function getReturn(id: string): Promise<ReturnResponse> {
  return apiGet<ReturnResponse>(`${BASE}/${id}`);
}

export async function createReturn(payload: CreateReturnPayload): Promise<ReturnResponse> {
  return apiPost<ReturnResponse>(BASE, payload);
}

export async function updateReturn(
  id: string,
  payload: UpdateReturnPayload,
): Promise<ReturnResponse> {
  return apiPatch<ReturnResponse>(`${BASE}/${id}`, payload);
}

export async function receiveReturn(id: string): Promise<ReturnResponse> {
  return apiPost<ReturnResponse>(`${BASE}/${id}/receive`);
}

export async function inspectReturn(
  id: string,
  payload: InspectReturnPayload,
): Promise<ReturnResponse> {
  return apiPost<ReturnResponse>(`${BASE}/${id}/inspect`, payload);
}

export async function completeReturn(id: string): Promise<ReturnResponse> {
  return apiPost<ReturnResponse>(`${BASE}/${id}/complete`);
}

export async function recoverLostReturn(
  id: string,
  payload: {
    items: Array<{ rentalOrderItemId: string; quantity: number }>;
    refund?: {
      rentalInvoiceId: string;
      amount: number;
      paymentNumber: string;
      paymentMethod?: string;
      paymentDate?: string;
      referenceNumber?: string | null;
      notes?: string | null;
    };
  },
): Promise<{ return: ReturnResponse; refund: unknown }> {
  return apiPost<{ return: ReturnResponse; refund: unknown }>(
    `${BASE}/${id}/recover-lost`,
    payload,
  );
}

export async function cancelReturn(id: string): Promise<ReturnResponse> {
  return apiPost<ReturnResponse>(`${BASE}/${id}/cancel`);
}
