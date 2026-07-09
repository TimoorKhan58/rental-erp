import type { NextRequest } from "next/server";

import { handleCompleteMaintenance } from "@/modules/maintenance/presentation/routes/maintenance-api.routes";

import { resolveMaintenanceApplicationServices } from "../../_composition/resolve-maintenance-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleCompleteMaintenance(
    request,
    id,
    resolveMaintenanceApplicationServices,
  );
}
