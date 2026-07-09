import type { NextRequest } from "next/server";

import {
  handleCreateDispatch,
  handleListDispatches,
} from "@/modules/dispatch/presentation/routes/dispatch-api.routes";

import { resolveDispatchApplicationServices } from "./_composition/resolve-dispatch-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListDispatches(request, resolveDispatchApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateDispatch(request, resolveDispatchApplicationServices);
}
