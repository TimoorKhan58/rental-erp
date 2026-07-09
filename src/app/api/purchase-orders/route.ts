import type { NextRequest } from "next/server";

import {
  handleCreatePurchaseOrder,
  handleListPurchaseOrders,
} from "@/modules/procurement/presentation/routes/purchase-order-api.routes";

import { resolvePurchaseOrderApplicationServices } from "./_composition/resolve-purchase-order-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListPurchaseOrders(
    request,
    resolvePurchaseOrderApplicationServices,
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreatePurchaseOrder(
    request,
    resolvePurchaseOrderApplicationServices,
  );
}
