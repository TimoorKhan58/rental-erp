import type { NextRequest } from "next/server";

import { handleGetRentalInvoiceSummary } from "@/modules/rental-invoice/presentation/routes/rental-invoice-api.routes";

import { resolveRentalInvoiceApplicationServices } from "../_composition/resolve-rental-invoice-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetRentalInvoiceSummary(
    request,
    resolveRentalInvoiceApplicationServices,
  );
}
