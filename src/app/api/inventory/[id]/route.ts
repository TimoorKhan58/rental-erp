import type { NextRequest } from "next/server";

import {
  handleDeleteInventory,
  handleGetInventoryById,
  handleUpdateInventory,
} from "@/modules/inventory/presentation/routes/inventory-api.routes";

import { resolveInventoryApplicationServices } from "../_composition/resolve-inventory-services";

interface InventoryRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: InventoryRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetInventoryById(
    request,
    id,
    resolveInventoryApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: InventoryRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateInventory(
    request,
    id,
    resolveInventoryApplicationServices,
  );
}

export async function DELETE(
  request: NextRequest,
  context: InventoryRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleDeleteInventory(
    request,
    id,
    resolveInventoryApplicationServices,
  );
}
