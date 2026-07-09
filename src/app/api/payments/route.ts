import type { NextRequest } from "next/server";

import {
  handleCreatePayment,
  handleListPayments,
} from "@/modules/payment/presentation/routes/payment-api.routes";

import { resolvePaymentApplicationServices } from "./_composition/resolve-payment-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListPayments(request, resolvePaymentApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreatePayment(request, resolvePaymentApplicationServices);
}
