import type { NextRequest } from "next/server";

import {
  handleDeleteWarehouse,
  handleGetWarehouseById,
  handleUpdateWarehouse,
} from "@/modules/warehouse/presentation/routes/warehouse-api.routes";

import { resolveWarehouseApplicationServices } from "../_composition/resolve-warehouse-services";

interface WarehouseRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: WarehouseRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetWarehouseById(
    request,
    id,
    resolveWarehouseApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: WarehouseRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateWarehouse(
    request,
    id,
    resolveWarehouseApplicationServices,
  );
}

export async function DELETE(
  request: NextRequest,
  context: WarehouseRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleDeleteWarehouse(
    request,
    id,
    resolveWarehouseApplicationServices,
  );
}
