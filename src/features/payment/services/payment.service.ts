import type {
  CreatePaymentPayload,
  ListPaymentsParams,
  PaymentListResponse,
  PaymentResponse,
  UpdatePaymentPayload,
} from "../types";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/payments";

export async function getPayments(
  params: ListPaymentsParams = {},
): Promise<PaymentListResponse> {
  return apiGet<PaymentListResponse>(BASE, { params });
}

export async function getPayment(id: string): Promise<PaymentResponse> {
  return apiGet<PaymentResponse>(`${BASE}/${id}`);
}

export async function createPayment(
  payload: CreatePaymentPayload,
): Promise<PaymentResponse> {
  return apiPost<PaymentResponse>(BASE, payload);
}

export async function updatePayment(
  id: string,
  payload: UpdatePaymentPayload,
): Promise<PaymentResponse> {
  return apiPatch<PaymentResponse>(`${BASE}/${id}`, payload);
}

export async function postPayment(id: string): Promise<PaymentResponse> {
  return apiPost<PaymentResponse>(`${BASE}/${id}/post`);
}

export async function voidPayment(id: string): Promise<PaymentResponse> {
  return apiPost<PaymentResponse>(`${BASE}/${id}/void`);
}
