import type {
  ListRentalInvoicesParams,
  RentalInvoiceListResponse,
  RentalInvoiceResponse,
} from "../types";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/rental-invoices";

export async function getRentalInvoices(
  params: ListRentalInvoicesParams = {},
): Promise<RentalInvoiceListResponse> {
  return apiGet<RentalInvoiceListResponse>(BASE, { params });
}

export async function getRentalInvoice(id: string): Promise<RentalInvoiceResponse> {
  return apiGet<RentalInvoiceResponse>(`${BASE}/${id}`);
}

export async function generateRentalInvoiceFromOrder(payload: {
  rentalOrderId: string;
  deliveryCharges?: number;
  labourCharges?: number;
  taxAmount?: number;
  conditionChargeOverrides?: Array<{
    rentalOrderItemId: string;
    damageUnitPrice?: number;
    lossUnitPrice?: number;
  }>;
}): Promise<RentalInvoiceResponse> {
  return apiPost<RentalInvoiceResponse>(`${BASE}/generate`, payload);
}

export type UpdateRentalInvoicePayload = {
  notes?: string | null;
  dueDate?: string | null;
  items?: Array<{
    lineType: string;
    description: string;
    quantity: number;
    unitPrice: number;
    sortOrder?: number;
    productName?: string | null;
    dailyRate?: number | null;
    numberOfDays?: number | null;
    damagedQuantity?: number;
    lostQuantity?: number;
    missingQuantity?: number;
    notes?: string | null;
    lineTotal?: number;
  }>;
};

export async function updateRentalInvoice(
  id: string,
  payload: UpdateRentalInvoicePayload,
): Promise<RentalInvoiceResponse> {
  return apiPatch<RentalInvoiceResponse>(`${BASE}/${id}`, payload);
}

export async function convertMissingToLoss(
  id: string,
): Promise<RentalInvoiceResponse> {
  return apiPost<RentalInvoiceResponse>(`${BASE}/${id}/convert-missing-to-loss`);
}

export async function issueRentalInvoice(id: string): Promise<RentalInvoiceResponse> {
  return apiPost<RentalInvoiceResponse>(`${BASE}/${id}/issue`);
}

export async function voidRentalInvoice(id: string): Promise<RentalInvoiceResponse> {
  return apiPost<RentalInvoiceResponse>(`${BASE}/${id}/void`);
}
