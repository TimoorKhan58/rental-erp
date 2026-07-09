import type { NextRequest } from "next/server";

import {
  handleCreateStockMovement,
  handleListStockMovements,
} from "@/modules/stock-movement/presentation/routes/stock-movement-api.routes";

import { resolveStockMovementServices } from "./_composition/resolve-stock-movement-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListStockMovements(request, resolveStockMovementServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateStockMovement(request, resolveStockMovementServices);
}
