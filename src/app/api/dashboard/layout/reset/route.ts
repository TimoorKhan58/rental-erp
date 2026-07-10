import type { NextRequest } from "next/server";

import { handleResetDashboardLayout } from "@/modules/dashboard/presentation/routes/dashboard-api.routes";

import { resolveDashboardApplicationServices } from "../_composition/resolve-dashboard-services";

export async function POST(request: NextRequest): Promise<Response> {
  return handleResetDashboardLayout(request, resolveDashboardApplicationServices);
}
