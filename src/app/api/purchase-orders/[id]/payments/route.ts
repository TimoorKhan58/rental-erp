import type { NextRequest } from "next/server";

import {
  handleCreatePurchaseOrderSupplierPayment,
  handleListPurchaseOrderSupplierPayments,
} from "@/modules/supplier-payment/presentation/routes/supplier-payment-api.routes";
import { resolveSupplierPaymentApplicationServices } from "@/app/api/supplier-payments/_composition/resolve-supplier-payment-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleListPurchaseOrderSupplierPayments(
    request,
    id,
    resolveSupplierPaymentApplicationServices,
  );
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleCreatePurchaseOrderSupplierPayment(
    request,
    id,
    resolveSupplierPaymentApplicationServices,
  );
}
