import type { NextRequest } from "next/server";

import {
  handleDeleteAttribute,
  handleGetAttributeById,
  handleUpdateAttribute,
} from "@/modules/catalog/presentation/routes/attribute-api.routes";

import { resolveCatalogApplicationServices } from "../../categories/_composition/resolve-catalog-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetAttributeById(request, id, resolveCatalogApplicationServices);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateAttribute(request, id, resolveCatalogApplicationServices);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleDeleteAttribute(request, id, resolveCatalogApplicationServices);
}
