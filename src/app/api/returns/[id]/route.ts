import type { NextRequest } from "next/server";

import {
  handleGetReturnById,
  handleUpdateReturn,
} from "@/modules/return/presentation/routes/return-api.routes";

import { resolveReturnApplicationServices } from "../_composition/resolve-return-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetReturnById(request, id, resolveReturnApplicationServices);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateReturn(request, id, resolveReturnApplicationServices);
}
