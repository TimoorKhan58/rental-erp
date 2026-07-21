import type { NextRequest } from "next/server";

import { handleGenerateRentalInvoiceFromOrder } from "@/modules/rental-invoice/presentation/routes/rental-invoice-api.routes";

import { resolveRentalInvoiceApplicationServices } from "../_composition/resolve-rental-invoice-services";

export async function POST(request: NextRequest): Promise<Response> {
  return handleGenerateRentalInvoiceFromOrder(
    request,
    resolveRentalInvoiceApplicationServices,
  );
}
