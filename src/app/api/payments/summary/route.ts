import type { NextRequest } from "next/server";

import { handleGetPaymentSummary } from "@/modules/payment/presentation/routes/payment-api.routes";

import { resolvePaymentApplicationServices } from "../_composition/resolve-payment-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetPaymentSummary(
    request,
    resolvePaymentApplicationServices,
  );
}
