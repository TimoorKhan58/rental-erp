import type { NextRequest } from "next/server";

import {
  handleDeleteAssetCategory,
  handleGetAssetCategoryById,
  handleUpdateAssetCategory,
} from "@/modules/asset/presentation/routes/asset-category-api.routes";

import { resolveCategoryApplicationServices } from "../_composition/resolve-asset-category-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetAssetCategoryById(
    request,
    id,
    resolveCategoryApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateAssetCategory(
    request,
    id,
    resolveCategoryApplicationServices,
  );
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleDeleteAssetCategory(
    request,
    id,
    resolveCategoryApplicationServices,
  );
}
