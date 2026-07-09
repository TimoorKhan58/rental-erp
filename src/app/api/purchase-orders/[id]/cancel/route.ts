import type { NextRequest } from "next/server";

import { handleCancelPurchaseOrder } from "@/modules/procurement/presentation/routes/purchase-order-api.routes";

import { resolvePurchaseOrderApplicationServices } from "../../_composition/resolve-purchase-order-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  return handleCancelPurchaseOrder(
    request,
    id,
    resolvePurchaseOrderApplicationServices,
  );
}
