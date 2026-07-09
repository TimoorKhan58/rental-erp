import type { NextRequest } from "next/server";

import {
  handleCreateRentalInvoice,
  handleListRentalInvoices,
} from "@/modules/rental-invoice/presentation/routes/rental-invoice-api.routes";

import { resolveRentalInvoiceApplicationServices } from "./_composition/resolve-rental-invoice-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListRentalInvoices(
    request,
    resolveRentalInvoiceApplicationServices,
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateRentalInvoice(
    request,
    resolveRentalInvoiceApplicationServices,
  );
}
