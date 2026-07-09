import type { NextRequest } from "next/server";

import {
  handleCreateMaintenance,
  handleListMaintenances,
} from "@/modules/maintenance/presentation/routes/maintenance-api.routes";

import { resolveMaintenanceApplicationServices } from "./_composition/resolve-maintenance-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListMaintenances(request, resolveMaintenanceApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateMaintenance(request, resolveMaintenanceApplicationServices);
}
