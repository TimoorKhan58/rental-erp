import type { NextRequest } from "next/server";

import {
  handleDeleteBrand,
  handleGetBrandById,
  handleUpdateBrand,
} from "@/modules/catalog/presentation/routes/brand-api.routes";

import { resolveCatalogApplicationServices } from "../../categories/_composition/resolve-catalog-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetBrandById(request, id, resolveCatalogApplicationServices);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateBrand(request, id, resolveCatalogApplicationServices);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleDeleteBrand(request, id, resolveCatalogApplicationServices);
}
