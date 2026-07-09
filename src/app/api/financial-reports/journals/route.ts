import type { NextRequest } from "next/server";

import { handleGetJournalReport } from "@/modules/financial-report/presentation/routes/financial-report-api.routes";

import { resolveFinancialReportApplicationServices } from "../_composition/resolve-financial-report-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetJournalReport(
    request,
    resolveFinancialReportApplicationServices,
  );
}
