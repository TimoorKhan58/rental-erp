import type {
  ListRentalInvoicesParams,
  CreateRentalInvoicePayload,
  RentalInvoiceListResponse,
  RentalInvoiceResponse,
} from "../types";
import { apiGet, apiPost } from "@/lib/api";

const BASE = "/rental-invoices";

export async function getRentalInvoices(
  params: ListRentalInvoicesParams = {},
): Promise<RentalInvoiceListResponse> {
  return apiGet<RentalInvoiceListResponse>(BASE, { params });
}

export async function getRentalInvoice(id: string): Promise<RentalInvoiceResponse> {
  return apiGet<RentalInvoiceResponse>(`${BASE}/${id}`);
}

export async function createRentalInvoice(
  payload: CreateRentalInvoicePayload,
): Promise<RentalInvoiceResponse> {
  return apiPost<RentalInvoiceResponse>(BASE, payload);
}

export async function issueRentalInvoice(id: string): Promise<RentalInvoiceResponse> {
  return apiPost<RentalInvoiceResponse>(`${BASE}/${id}/issue`);
}

export async function voidRentalInvoice(id: string): Promise<RentalInvoiceResponse> {
  return apiPost<RentalInvoiceResponse>(`${BASE}/${id}/void`);
}
