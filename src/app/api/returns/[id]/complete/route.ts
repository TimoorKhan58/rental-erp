import type { NextRequest } from "next/server";

import { handleCompleteReturn } from "@/modules/return/presentation/routes/return-api.routes";

import { resolveReturnApplicationServices } from "../../_composition/resolve-return-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleCompleteReturn(request, id, resolveReturnApplicationServices);
}
