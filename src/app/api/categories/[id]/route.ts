import type { NextRequest } from "next/server";

import {
  handleDeleteCategory,
  handleGetCategoryById,
  handleUpdateCategory,
} from "@/modules/catalog/presentation/routes/category-api.routes";

import { resolveCatalogApplicationServices } from "../../categories/_composition/resolve-catalog-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetCategoryById(request, id, resolveCatalogApplicationServices);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateCategory(request, id, resolveCatalogApplicationServices);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleDeleteCategory(request, id, resolveCatalogApplicationServices);
}
