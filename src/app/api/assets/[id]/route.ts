import type { NextRequest } from "next/server";

import {
  handleGetAssetById,
  handleUpdateAsset,
} from "@/modules/asset/presentation/routes/asset-api.routes";

import { resolveAssetApplicationServices } from "../_composition/resolve-asset-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetAssetById(request, id, resolveAssetApplicationServices);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateAsset(request, id, resolveAssetApplicationServices);
}
