import type { NextRequest } from "next/server";

import {
  handleGetPaymentById,
  handleUpdatePayment,
} from "@/modules/payment/presentation/routes/payment-api.routes";

import { resolvePaymentApplicationServices } from "../_composition/resolve-payment-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetPaymentById(
    request,
    id,
    resolvePaymentApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdatePayment(
    request,
    id,
    resolvePaymentApplicationServices,
  );
}
