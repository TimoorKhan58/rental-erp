import type { NextRequest } from "next/server";

import {
  handleGetPurchaseOrderById,
  handleUpdatePurchaseOrder,
} from "@/modules/procurement/presentation/routes/purchase-order-api.routes";

import { resolvePurchaseOrderApplicationServices } from "../_composition/resolve-purchase-order-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  return handleGetPurchaseOrderById(
    request,
    id,
    resolvePurchaseOrderApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  return handleUpdatePurchaseOrder(
    request,
    id,
    resolvePurchaseOrderApplicationServices,
  );
}
