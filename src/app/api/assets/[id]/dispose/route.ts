import type { NextRequest } from "next/server";

import { handleDisposeAsset } from "@/modules/asset/presentation/routes/asset-api.routes";

import { resolveAssetApplicationServices } from "../../_composition/resolve-asset-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleDisposeAsset(request, id, resolveAssetApplicationServices);
}
