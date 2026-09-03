import type { NextRequest } from "next/server";

import { handleGetDispatchSummary } from "@/modules/dispatch/presentation/routes/dispatch-api.routes";

import { resolveDispatchApplicationServices } from "../_composition/resolve-dispatch-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetDispatchSummary(
    request,
    resolveDispatchApplicationServices,
  );
}
