import type { NextRequest } from "next/server";

import {
  handleCreateAsset,
  handleListAssets,
} from "@/modules/asset/presentation/routes/asset-api.routes";

import { resolveAssetApplicationServices } from "./_composition/resolve-asset-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListAssets(request, resolveAssetApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateAsset(request, resolveAssetApplicationServices);
}
