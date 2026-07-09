import type { NextRequest } from "next/server";

import {
  handleGetDispatchById,
  handleUpdateDispatch,
} from "@/modules/dispatch/presentation/routes/dispatch-api.routes";

import { resolveDispatchApplicationServices } from "../_composition/resolve-dispatch-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  return handleGetDispatchById(
    request,
    id,
    resolveDispatchApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  return handleUpdateDispatch(
    request,
    id,
    resolveDispatchApplicationServices,
  );
}
