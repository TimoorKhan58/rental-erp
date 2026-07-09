import type { NextRequest } from "next/server";

import {
  handleCreateWarehouse,
  handleListWarehouses,
} from "@/modules/warehouse/presentation/routes/warehouse-api.routes";

import { resolveWarehouseApplicationServices } from "./_composition/resolve-warehouse-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListWarehouses(request, resolveWarehouseApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateWarehouse(request, resolveWarehouseApplicationServices);
}
