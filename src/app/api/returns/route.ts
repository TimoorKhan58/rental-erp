import type { NextRequest } from "next/server";

import {
  handleCreateReturn,
  handleListReturns,
} from "@/modules/return/presentation/routes/return-api.routes";

import { resolveReturnApplicationServices } from "./_composition/resolve-return-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListReturns(request, resolveReturnApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateReturn(request, resolveReturnApplicationServices);
}
