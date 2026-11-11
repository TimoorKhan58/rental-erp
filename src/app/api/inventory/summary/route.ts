import type { NextRequest } from "next/server";

import { handleGetInventorySummary } from "@/modules/inventory/presentation/routes/inventory-api.routes";

import { resolveInventoryApplicationServices } from "../_composition/resolve-inventory-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetInventorySummary(
    request,
    resolveInventoryApplicationServices,
  );
}
