import { apiGet, apiPost } from "@/lib/api";
import type {
  CreateSupplierPaymentPayload,
  ListSupplierPaymentsParams,
  SupplierPaymentListResponse,
  SupplierPaymentResponse,
} from "../types/supplier-payment.types";

const BASE = "/supplier-payments";

export async function getSupplierPayments(
  params: ListSupplierPaymentsParams = {},
): Promise<SupplierPaymentListResponse> {
  return apiGet<SupplierPaymentListResponse>(BASE, { params });
}

export async function getPurchaseOrderSupplierPayments(
  purchaseOrderId: string,
  params: Omit<ListSupplierPaymentsParams, "purchaseOrderId"> = {},
): Promise<SupplierPaymentListResponse> {
  return apiGet<SupplierPaymentListResponse>(
    `/purchase-orders/${purchaseOrderId}/payments`,
    { params },
  );
}

export async function getSupplierPayment(
  id: string,
): Promise<SupplierPaymentResponse> {
  return apiGet<SupplierPaymentResponse>(`${BASE}/${id}`);
}

export async function createSupplierPayment(
  payload: CreateSupplierPaymentPayload,
): Promise<SupplierPaymentResponse> {
  return apiPost<SupplierPaymentResponse>(BASE, payload);
}

export async function createPurchaseOrderSupplierPayment(
  purchaseOrderId: string,
  payload: Omit<CreateSupplierPaymentPayload, "purchaseOrderId">,
): Promise<SupplierPaymentResponse> {
  return apiPost<SupplierPaymentResponse>(
    `/purchase-orders/${purchaseOrderId}/payments`,
    payload,
  );
}

export async function postSupplierPayment(
  id: string,
): Promise<SupplierPaymentResponse> {
  return apiPost<SupplierPaymentResponse>(`${BASE}/${id}/post`);
}

export async function voidSupplierPayment(
  id: string,
): Promise<SupplierPaymentResponse> {
  return apiPost<SupplierPaymentResponse>(`${BASE}/${id}/void`);
}
