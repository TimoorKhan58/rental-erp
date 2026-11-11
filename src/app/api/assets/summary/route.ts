import type { NextRequest } from "next/server";

import { handleGetAssetSummary } from "@/modules/asset/presentation/routes/asset-api.routes";

import { resolveAssetApplicationServices } from "../_composition/resolve-asset-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetAssetSummary(
    request,
    resolveAssetApplicationServices,
  );
}
