import type { NextRequest } from "next/server";

import { handleCompleteDispatch } from "@/modules/dispatch/presentation/routes/dispatch-api.routes";

import { resolveDispatchApplicationServices } from "../../_composition/resolve-dispatch-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  return handleCompleteDispatch(
    request,
    id,
    resolveDispatchApplicationServices,
  );
}
