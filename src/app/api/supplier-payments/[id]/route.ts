import type { NextRequest } from "next/server";

import { handleGetSupplierPaymentById } from "@/modules/supplier-payment/presentation/routes/supplier-payment-api.routes";

import { resolveSupplierPaymentApplicationServices } from "../_composition/resolve-supplier-payment-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetSupplierPaymentById(
    request,
    id,
    resolveSupplierPaymentApplicationServices,
  );
}
