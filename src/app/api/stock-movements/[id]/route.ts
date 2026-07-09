import type { NextRequest } from "next/server";

import { handleGetStockMovementById } from "@/modules/stock-movement/presentation/routes/stock-movement-api.routes";

import { resolveStockMovementServices } from "../_composition/resolve-stock-movement-services";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetStockMovementById(request, id, resolveStockMovementServices);
}
