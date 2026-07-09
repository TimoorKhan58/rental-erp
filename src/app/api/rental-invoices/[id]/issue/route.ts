import type { NextRequest } from "next/server";

import { handleIssueRentalInvoice } from "@/modules/rental-invoice/presentation/routes/rental-invoice-api.routes";

import { resolveRentalInvoiceApplicationServices } from "../../_composition/resolve-rental-invoice-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleIssueRentalInvoice(
    request,
    id,
    resolveRentalInvoiceApplicationServices,
  );
}
