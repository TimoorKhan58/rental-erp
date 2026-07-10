import type { NextRequest } from "next/server";

import {
  handleDeleteTag,
  handleGetTagById,
  handleUpdateTag,
} from "@/modules/catalog/presentation/routes/tag-api.routes";

import { resolveCatalogApplicationServices } from "../../categories/_composition/resolve-catalog-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetTagById(request, id, resolveCatalogApplicationServices);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateTag(request, id, resolveCatalogApplicationServices);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleDeleteTag(request, id, resolveCatalogApplicationServices);
}
