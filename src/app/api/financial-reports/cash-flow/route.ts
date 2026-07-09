import type { NextRequest } from "next/server";

import { handleGetCashFlowSummary } from "@/modules/financial-report/presentation/routes/financial-report-api.routes";

import { resolveFinancialReportApplicationServices } from "../_composition/resolve-financial-report-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetCashFlowSummary(
    request,
    resolveFinancialReportApplicationServices,
  );
}
