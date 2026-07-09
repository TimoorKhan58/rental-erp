import type { NextRequest } from "next/server";

import {
  handleCreateInventory,
  handleListInventory,
} from "@/modules/inventory/presentation/routes/inventory-api.routes";

import { resolveInventoryApplicationServices } from "./_composition/resolve-inventory-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListInventory(request, resolveInventoryApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateInventory(request, resolveInventoryApplicationServices);
}
