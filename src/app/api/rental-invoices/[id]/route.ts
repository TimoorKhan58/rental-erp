import type { NextRequest } from "next/server";

import {
  handleGetRentalInvoiceById,
  handleUpdateRentalInvoice,
} from "@/modules/rental-invoice/presentation/routes/rental-invoice-api.routes";

import { resolveRentalInvoiceApplicationServices } from "../_composition/resolve-rental-invoice-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetRentalInvoiceById(
    request,
    id,
    resolveRentalInvoiceApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateRentalInvoice(
    request,
    id,
    resolveRentalInvoiceApplicationServices,
  );
}
