import type { NextRequest } from "next/server";

import { handlePostPayment } from "@/modules/payment/presentation/routes/payment-api.routes";

import { resolvePaymentApplicationServices } from "../../_composition/resolve-payment-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handlePostPayment(
    request,
    id,
    resolvePaymentApplicationServices,
  );
}
