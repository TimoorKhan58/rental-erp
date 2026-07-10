import type { NextRequest } from "next/server";

import {
  handleCreateAssetCategory,
  handleListAssetCategories,
} from "@/modules/asset/presentation/routes/asset-category-api.routes";

import { resolveCategoryApplicationServices } from "./_composition/resolve-asset-category-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListAssetCategories(
    request,
    resolveCategoryApplicationServices,
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateAssetCategory(
    request,
    resolveCategoryApplicationServices,
  );
}
