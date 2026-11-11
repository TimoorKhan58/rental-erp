import type { NextRequest } from "next/server";

import { handleGetRepairSummary } from "@/modules/repair/presentation/routes/repair-api.routes";

import { resolveRepairApplicationServices } from "../_composition/resolve-repair-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetRepairSummary(
    request,
    resolveRepairApplicationServices,
  );
}
