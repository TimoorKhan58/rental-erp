import type { NextRequest } from "next/server";

import {
  handleCreateSupplierPayment,
  handleListSupplierPayments,
} from "@/modules/supplier-payment/presentation/routes/supplier-payment-api.routes";

import { resolveSupplierPaymentApplicationServices } from "./_composition/resolve-supplier-payment-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListSupplierPayments(
    request,
    resolveSupplierPaymentApplicationServices,
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateSupplierPayment(
    request,
    resolveSupplierPaymentApplicationServices,
  );
}
