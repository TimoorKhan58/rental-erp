import type { NextRequest } from "next/server";

import {
  handleGetRepairById,
  handleUpdateRepair,
} from "@/modules/repair/presentation/routes/repair-api.routes";

import { resolveRepairApplicationServices } from "../_composition/resolve-repair-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetRepairById(request, id, resolveRepairApplicationServices);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateRepair(request, id, resolveRepairApplicationServices);
}
