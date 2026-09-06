import type { NextRequest } from "next/server";

import { handleGetMaintenanceSummary } from "@/modules/maintenance/presentation/routes/maintenance-api.routes";

import { resolveMaintenanceApplicationServices } from "../_composition/resolve-maintenance-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetMaintenanceSummary(
    request,
    resolveMaintenanceApplicationServices,
  );
}
