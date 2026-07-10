import type { NextRequest } from "next/server";

import {
  handleCreateDashboardLayout,
  handleGetDashboardLayout,
  handleUpdateDashboardLayout,
} from "@/modules/dashboard/presentation/routes/dashboard-api.routes";

import { resolveDashboardApplicationServices } from "./_composition/resolve-dashboard-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetDashboardLayout(request, resolveDashboardApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateDashboardLayout(request, resolveDashboardApplicationServices);
}

export async function PATCH(request: NextRequest): Promise<Response> {
  return handleUpdateDashboardLayout(request, resolveDashboardApplicationServices);
}
