import type { NextRequest } from "next/server";

import { handleGetRepairReport } from "@/modules/reporting/presentation/routes/reporting-api.routes";

import { resolveReportingApplicationServices } from "../_composition/resolve-reporting-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetRepairReport(request, resolveReportingApplicationServices);
}
