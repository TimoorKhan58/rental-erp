import type { NextRequest } from "next/server";

import { handleGetDashboard } from "@/modules/reporting/presentation/routes/reporting-api.routes";

import { resolveReportingApplicationServices } from "../_composition/resolve-reporting-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetDashboard(request, resolveReportingApplicationServices);
}
