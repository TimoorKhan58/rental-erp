import type { NextRequest } from "next/server";

import { handleCancelRepair } from "@/modules/repair/presentation/routes/repair-api.routes";

import { resolveRepairApplicationServices } from "../../_composition/resolve-repair-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleCancelRepair(request, id, resolveRepairApplicationServices);
}
