import type { NextRequest } from "next/server";

import { handleGetReturnSummary } from "@/modules/return/presentation/routes/return-api.routes";

import { resolveReturnApplicationServices } from "../_composition/resolve-return-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetReturnSummary(
    request,
    resolveReturnApplicationServices,
  );
}
