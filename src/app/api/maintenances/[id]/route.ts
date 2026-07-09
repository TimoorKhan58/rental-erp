import type { NextRequest } from "next/server";

import {
  handleGetMaintenanceById,
  handleUpdateMaintenance,
} from "@/modules/maintenance/presentation/routes/maintenance-api.routes";

import { resolveMaintenanceApplicationServices } from "../_composition/resolve-maintenance-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetMaintenanceById(
    request,
    id,
    resolveMaintenanceApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateMaintenance(
    request,
    id,
    resolveMaintenanceApplicationServices,
  );
}
